#!/bin/bash
while true; do
echo "Create a valid user name and a passwod"
read -p "Username:" username
read -p "Password:" password
echo

pass="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_])[a-zA-Z0-9!@#$%^&*()_]{8,}"
if echo "$password" | grep -Pq "$pass";
then
	echo "Credintials have been created sussessfully"
	exit
else
	echo "Invalid password. Make sure your password is at least 8 characters long including Upper and lower case, a number and a special character"
fi
done
