#!/bin/bash

########################### FUNCTIONS ###################################

# welcome message to the user
welcome_user(){
	echo 'Please enter your name:'
	read -r name
}


goodbye_user(){
	echo "Thank you for interacting with us"
	echo "we wish you a great day"
	echo "see you soon"
	echo "Goodbye $name"
}

# User choice
user_choice(){
	echo "Choose [rock], [paper], or [scissors]:"
	read -r choice
}

# Computer Choice
computer_choice(){
	choices=("rock" "paper" "scissors")
	rand=$(( RANDOM % 3))
	comp="${choices[$rand]}"
	echo "Computer chose $comp"

}


# Deciding who the winner is
winner(){
	if [[ "$choice" == "$comp" ]];then
		echo "tie"
	elif [[ "$choice" == "rock" && "$comp" == "scissors" ]];then
		echo "You win"
        elif [[ "$choice" == "paper" && "$comp" == "rock" ]];then
                echo "You win"
        elif [[ "$choice" == "scissors" && "$comp" == "paper" ]];then
                echo "You win"
	else
                echo "You lose"
	fi

}

################################### END FUNCTIONS #################################################


################################### Main code ##################################################### 
welcome_user
goodbye_user
user_choice
computer_choice
goodbye_user
winner
goodbye_user
echo 'the code is done'
goodbye_user
################################### END Main code #####################################################
