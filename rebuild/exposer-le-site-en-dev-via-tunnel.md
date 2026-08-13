# Exposer le site en dev via tunnel

Ce projet est un site statique. Pour le tester depuis un navigateur externe en environnement de dev, le plus simple est de lancer un serveur local puis d'ouvrir un tunnel public.

## Methode recommandee: Pinggy

Cette methode a ete verifiee dans ce workspace et renvoie bien la page avec un statut HTTP 200.

### 1. Demarrer le serveur local

Depuis la racine du projet:

```bash
python3 -m http.server 8000
```

Le site est alors disponible localement sur:

```text
http://127.0.0.1:8000/
```

### 2. Ouvrir un tunnel public

Dans un second terminal:

```bash
ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:8000 qr@a.pinggy.io
```

Pinggy affiche ensuite une ou plusieurs URLs publiques, par exemple:

```text
https://xxxxx.free.pinggy.net
https://yyyyy.run.pinggy-free.link
```

Ouvrir l'une de ces URLs dans le navigateur pour tester le rendu du site.

## Verification rapide

Pour verifier que le serveur local repond bien:

```bash
curl -I http://127.0.0.1:8000/
```

Pour verifier qu'une URL publique Pinggy repond bien:

```bash
curl -I -L https://xxxxx.free.pinggy.net
```

Une reponse `HTTP/1.0 200 OK` confirme que la page est servie correctement.

## Pourquoi ne pas utiliser LocalTunnel par defaut

La commande suivante peut fonctionner:

```bash
npx --yes localtunnel --port 8000
```

Mais LocalTunnel affiche souvent une page intermediaire de securite demandant de confirmer l'IP de l'hebergeur avant d'acceder au site. Pour un test rapide non technique, Pinggy est plus pratique.

## Pourquoi l'URL Codespaces peut echouer

Si le port 8000 n'est pas expose publiquement dans GitHub Codespaces, l'URL publique peut renvoyer une erreur 404 meme si le serveur local fonctionne.

Dans ce cas:

1. verifier qu'un processus ecoute bien sur le port 8000;
2. ouvrir ou reacheminer le port dans Codespaces;
3. si le panneau des ports n'est pas disponible, utiliser Pinggy.

## Limites

- Le tunnel Pinggy gratuit expire apres un certain temps.
- L'URL change a chaque nouvelle ouverture du tunnel.
- Le tunnel reste actif tant que la commande SSH reste lancee.