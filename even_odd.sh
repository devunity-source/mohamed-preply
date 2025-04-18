#!/bin/bash


loading(){
	echo 'loading...'
	sleep 5
}

read_number(){
	read -r number
}


even_odd(){
	if (( $number % 2 == 0));then
	        echo "Number $number is even"
	else
        	echo "Number $number is odd"
	fi

}






echo "please enter a number"
read_number
even_odd
loading

echo "please enter another number"
read_number
even_odd
loading

echo "please enter a third number"
read_number
even_odd

loading
