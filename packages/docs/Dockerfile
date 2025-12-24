FROM nginx:1.21.4
RUN mkdir /app
ADD ./ /app
RUN cd /app
COPY nginx /etc/nginx/conf.d/default.conf
RUN mkdir /log