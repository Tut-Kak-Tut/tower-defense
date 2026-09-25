FROM nginx:alpine
COPY index.html style.css /usr/share/nginx/html/
COPY js /usr/share/nginx/html/js
COPY music /usr/share/nginx/html/music
EXPOSE 80
