#!/bin/bash

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



user_choice
computer_choice
winner










