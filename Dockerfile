# Use the lightweight version of the Python 3.10.4 image based on Alpine Linux
FROM python:3.10.4-alpine

# Install the build dependencies for psycopg2, a PostgreSQL adapter for Python
# These are necessary to build the psycopg2 package from source
RUN apk update && apk add --no-cache libpq postgresql-dev gcc python3-dev musl-dev

# Upgrade pip to the latest version
RUN pip install --upgrade pip

# Set the working directory inside the container to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install the Python dependencies defined in requirements.txt
# --no-cache-dir option is used to not store the index page in cache
RUN pip install --no-cache-dir -r requirements.txt

# Set an environment variable to indicate that the application is running in production
ENV FLASK_ENV=production

# Command to run the Flask application
# flask run: Starts a lightweight development web server on the local machine
# --host 0.0.0.0: Makes the server accessible from any IP address
CMD ["flask", "run", "--host", "0.0.0.0"]

# Inform Docker that the container listens on the specified network port at runtime.
# Note: This does not actually publish the port. It functions as a type of documentation
# between the person who builds the image and the person who runs the container.
EXPOSE 5000
