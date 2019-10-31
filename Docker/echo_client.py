#!/usr/bin/env python3

import socket

def client_program():
    host = socket.gethostname()  # as both code is running on same pc
    # port = 5000  # socket server port number
    port = 1234  # socket server port number


    client_socket = socket.socket()  # instantiate
    client_socket.connect((host, port))  # connect to the server

    message = input(" -> ")  # take input

    while message.lower().strip() != 'exit':
        client_socket.send(message.encode())  # send message
        data = client_socket.recv(4096).decode()  # receive response

        print('server: ' + data)  # show in terminal

        message = input(" -> ")  # again take input

    client_socket.close()  # close the connection

if __name__ == '__main__':
    client_program()