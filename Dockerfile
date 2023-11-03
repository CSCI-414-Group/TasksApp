FROM python:3.10.4-alpine

# Install the build dependencies for psycopg2
RUN apk update && apk add --no-cache libpq postgresql-dev gcc python3-dev musl-dev

RUN pip install --upgrade pip

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

ENV FLASK_ENV=production

CMD ["flask", "run", "--host", "0.0.0.0"]

EXPOSE 5000