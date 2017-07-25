# Use an official Python runtime as a base image
FROM node:6.11.0

# Set the working directory to /app
WORKDIR /computation

# Copy the current directory contents into the container at /app
ADD . /computation

RUN cd /computation && npm install
