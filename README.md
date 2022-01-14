# tic_tac_toe_python
This is my first API using flask for tic_tac_toe game build in python . 
Postman is used to send data to the server using POST method.
firstly we send players name and symbol details and then we send player symbol,row, column position till the game get over or we find a winner
This is how we send details in json using postman:
STEP:1

http://192.168.29.240:3000/details

{
    "player1":"vivek"
    "symbol1":"x",
    "player2":"karan",
    "symbol2":"o"
}


if status is 200 ok then.🆗


STEP:2



http://192.168.29.240:3000/play


{
    "symbol":"x",
    "row":2,
    "column":1
}


if symbol and position entered are correct then staus will be 200 ok🆗 and again send json format with different positons untill the game drawn or finds winner.
