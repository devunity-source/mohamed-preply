// Real lesson content, keyed by lesson title. Lessons without an entry fall
// back to a short summary. Format (rendered by components/lesson-body.tsx):
//   ## heading, paragraphs, "- " bullet lists, ``` fenced code, `inline code`.

export const LESSON_CONTENT: Record<string, string> = {
  "Containers and images": `A container is a normal Linux process with a fenced-off view of the machine: its own filesystem, process list and network. Nothing is virtualised. That's why containers start in milliseconds and why you can run dozens on a laptop.

## Images are layered filesystems

An image is a stack of read-only layers plus some metadata (the command to run, environment variables, the user). Each instruction in a Dockerfile adds a layer, and layers are cached, so order matters: put the things that change least at the top.

\`\`\`
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
CMD ["node", "server.js"]
\`\`\`

Copying \`package.json\` before the source means a code change doesn't reinstall every dependency.

## Tags are not versions

\`node:22-alpine\` can point at a different image tomorrow. In production, pin by digest (\`node@sha256:…\`) or at least by a specific patch tag, and let a bot like Renovate bump it.

## Three habits worth building now

- Run as a non-root user (\`USER node\` above).
- Keep images small: alpine or distroless bases, multi-stage builds for compiled code.
- Scan images in CI (\`trivy image your-app:tag\`) before they reach a registry.

## Try it

\`\`\`
docker build -t hello-api .
docker run --rm -p 8080:8080 hello-api
docker image history hello-api
\`\`\`

The last command shows every layer and its size. Find the biggest one and ask why it's there.`,

  "Pods, Deployments and Services": `Kubernetes doesn't run containers directly. It runs **Pods**, wraps them in **Deployments** so they survive failure, and puts **Services** in front so other things can find them.

## Pod

The smallest thing Kubernetes schedules: one or more containers that share a network namespace and can share volumes. Pods are disposable. When one dies, it's replaced by a new Pod with a new IP. Never depend on a Pod's IP.

## Deployment

You describe the state you want and the Deployment controller keeps reality matching it.

\`\`\`
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-api
spec:
  replicas: 3
  selector:
    matchLabels: { app: hello-api }
  template:
    metadata:
      labels: { app: hello-api }
    spec:
      containers:
        - name: api
          image: myregistry.azurecr.io/hello-api:1.4.2
          ports: [{ containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /healthz, port: 8080 }
\`\`\`

Change the image tag and apply again: the Deployment performs a rolling update, starting new Pods and only removing old ones once the new ones pass their readiness probe.

## Service

A stable name and virtual IP in front of whichever Pods currently match a label selector.

\`\`\`
apiVersion: v1
kind: Service
metadata:
  name: hello-api
spec:
  selector: { app: hello-api }
  ports: [{ port: 80, targetPort: 8080 }]
\`\`\`

Other Pods can now call \`http://hello-api\` and Kubernetes load-balances across the healthy replicas.

## Check your understanding

- Delete a Pod with \`kubectl delete pod <name>\`. What replaces it, and why?
- What happens to traffic during a rollout if the new image fails its readiness probe?`,

  "Kubernetes networking and Ingress": `Three rules explain most of Kubernetes networking:

- Every Pod gets its own IP address.
- Every Pod can reach every other Pod without NAT (unless a NetworkPolicy says otherwise).
- Services give groups of Pods a stable address.

## Service types

- **ClusterIP** (default): reachable only inside the cluster. Use it for almost everything.
- **NodePort**: opens the same port on every node. Mostly for testing.
- **LoadBalancer**: asks the cloud (Azure here) for a public or internal load balancer. One per Service, so it gets expensive.

## Ingress: one front door for HTTP

Instead of a load balancer per app, run one ingress controller (for example ingress-nginx) behind one load balancer, and route by host and path:

\`\`\`
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  ingressClassName: nginx
  tls:
    - hosts: [api.example.com]
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: hello-api, port: { number: 80 } }
\`\`\`

cert-manager can fill \`api-tls\` automatically with a Let's Encrypt certificate.

## NetworkPolicy: default open is a risk

Out of the box any Pod can talk to any other. A NetworkPolicy lets you say "only the frontend may call the API". Start with a deny-all policy per namespace, then allow what you need. On AKS this needs a network policy engine (Azure or Calico) enabled when the cluster is created.

## Debugging checklist

- \`kubectl get endpoints hello-api\`: empty means the selector matches no ready Pods.
- \`kubectl run tmp --rm -it --image=busybox -- wget -qO- http://hello-api\`: test from inside the cluster.
- Ingress 404? Check \`ingressClassName\` and the host header you're sending.`,

  "Deploying to AKS": `Time to put it together: build an image, push it to Azure Container Registry, and run it on AKS behind Ingress. Budget about 45 minutes. Everything here costs money while it runs, so tear it down at the end.

## 1. Create the cluster and registry

\`\`\`
az group create -n rg-k8s-lab -l westeurope
az acr create -n <yourname>acr -g rg-k8s-lab --sku Basic
az aks create -n aks-lab -g rg-k8s-lab --node-count 2 \\
  --node-vm-size Standard_D2s_v5 --attach-acr <yourname>acr \\
  --network-plugin azure --network-policy azure --generate-ssh-keys
az aks get-credentials -n aks-lab -g rg-k8s-lab
\`\`\`

\`--attach-acr\` lets the cluster pull from your registry without storing a password.

## 2. Build and push

\`\`\`
az acr build -r <yourname>acr -t hello-api:1.0.0 .
\`\`\`

This builds in Azure, so you don't need Docker locally.

## 3. Deploy

Update the image in your Deployment to \`<yourname>acr.azurecr.io/hello-api:1.0.0\`, then:

\`\`\`
kubectl apply -f deployment.yaml -f service.yaml
kubectl rollout status deploy/hello-api
\`\`\`

## 4. Expose it

Install ingress-nginx with Helm, apply your Ingress, then find the public IP:

\`\`\`
kubectl get svc -n ingress-nginx
\`\`\`

## 5. Prove it works

- \`curl http://<ip>/healthz\` returns 200.
- Scale to 5 replicas and watch the new Pods come up.
- Roll out \`1.0.1\` and confirm there's no downtime.

## 6. Tear it down

\`\`\`
az group delete -n rg-k8s-lab --yes --no-wait
\`\`\`

This is the core of Lab #04 and of your week 4 assignment. Stuck? Post the output of \`kubectl describe pod <name>\` in the cohort's Questions space.`,
};
