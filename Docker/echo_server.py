#!/usr/bin/env python3

import socket

def server_program():
    # get the hostname
    host = socket.gethostname()
    # port = 5000  # initiate port no above 1024
    port = 1234  # initiate port no above 1024    

    server_socket = socket.socket()  # get instance
    # look closely. The bind() function takes tuple as argument
    server_socket.bind((host, port))  # bind host address and port together
    print("Running on: " + str(host) + ":" + str(port))

    # configure how many client the server can listen simultaneously
    server_socket.listen(2)
    conn, address = server_socket.accept()  # accept new connection
    print("Connection from: " + str(address))
    while True:
        # receive data stream. it won't accept data packet greater than 1024 bytes
        data = conn.recv(4096).decode()
        if not data:
            # if data is not received break
            break
        print("client: " + str(data))
        if (str(data) == 'exit'):
            print("Exiting....")
        # data = input(' -> ')
        data = 'OK!'
        conn.send(data.encode())  # send data to the client

    conn.close()  # close the connection


if __name__ == '__main__':
    server_program()


# https://medium.com/python-pandemonium/python-socket-communication-e10b39225a4c
# https://realpython.com/python-sockets/#echo-client-and-server