FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* est figé dans le bundle client au moment du build : c'est
# l'adresse que le NAVIGATEUR (pas le conteneur) utilisera pour joindre le
# service PartyKit. Par défaut "localhost:1999" convient pour tester depuis
# la même machine ; surcharge-la (via .env + docker-compose) si le site doit
# être joignable depuis un autre appareil/réseau.
ARG NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
ENV NEXT_PUBLIC_PARTYKIT_HOST=$NEXT_PUBLIC_PARTYKIT_HOST

RUN npm run build

EXPOSE 3000 1999

CMD ["npm", "run", "start"]
