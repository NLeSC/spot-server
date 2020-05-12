# build stage
FROM nlesc/spot:latest as build-stage
LABEL maintainer="f.diblen@esciencecenter.nl"
ENV container docker
ENV NPM_CONFIG_LOGLEVEL info

RUN date >/build-date.txt
ARG BUILD_DATE
LABEL org.label-schema.build-date=$BUILD_DATE

WORKDIR /spot
RUN mv /usr/share/nginx/html /spot/app

RUN echo http://nl.alpinelinux.org/alpine/edge/main > /etc/apk/repositories; \
    echo http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories; \
    echo http://nl.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories; \
    apk update

RUN apk --no-cache --update add bash coreutils findutils build-base git bind-tools \
    nodejs nodejs-npm \
    python3 python3-dev \
    postgresql-dev postgresql-client \
    py3-numpy py3-pandas py-sqlalchemy py3-psycopg2 py3-tqdm \
    vim curl

# RUN git clone https://github.com/NLeSC/spot-server.git && \
#     cd spot-server && \
#     npm install

RUN mkdir -p /spot/spot-server

COPY . /spot/spot-server/

RUN cd /spot/spot-server/ && \
    npm install

COPY ./Docker/docker_init.sh /spot/docker_init.sh
RUN chmod +x /spot/docker_init.sh

COPY ./Docker/spot_init.py /spot/spot_init.py
RUN chmod +x /spot/spot_init.py

COPY ./Docker/wait-for-postgres.sh /spot/wait-for-postgres.sh
RUN chmod +x /spot/wait-for-postgres.sh

# clean up
RUN apk del coreutils findutils build-base git bind-tools python3-dev postgresql-dev

CMD ["/spot/docker_init.sh"]