FROM node:20-alpine

# Install dependencies required for mediasoup
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers \
    git \
    bash \
    gcc \
    musl-dev \
    python3-dev

# Setup Python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Now pip will install packages in the virtual environment
RUN python3 -m pip install --upgrade pip
RUN python3 -m pip install invoke

WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .

EXPOSE 9000
EXPOSE 2000-2020/udp

CMD ["node", "server.js"] 