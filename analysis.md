# Smart Search Service Analysis - Sat Aug  9 07:32:19 PDT 2025
## Current Services:
1dfae5272a78   docker-showcase                                         "docker-entrypoint.s…"    5 minutes ago       Up 4 minutes (unhealthy)     0.0.0.0:5100->5100/tcp                                       smart-search-showcase-postgres-redis-healthcare-small
2995ae97ad3b   postgres:15                                             "docker-entrypoint.s…"    5 minutes ago       Up 5 minutes (healthy)       0.0.0.0:5101->5432/tcp                                       smart-search-postgres-postgres-redis-healthcare-small
b90f71f98750   redis/redis-stack-server:latest                         "/entrypoint.sh"          5 minutes ago       Up 5 minutes (healthy)       0.0.0.0:5102->6379/tcp                                       smart-search-redis-postgres-redis-healthcare-small
a0321bfd078f   docker-postgres-redis-showcase                          "docker-entrypoint.s…"    About an hour ago   Up About an hour (healthy)   3002/tcp, 0.0.0.0:13002->13002/tcp                           smart-search-postgres-redis-showcase-alt
6a9fb5d5c490   postgres:15                                             "docker-entrypoint.s…"    2 hours ago         Up 2 hours (healthy)         0.0.0.0:15432->5432/tcp                                      smart-search-postgres-alt
155d61873f58   redis:7.2-alpine                                        "docker-entrypoint.s…"    2 hours ago         Up 2 hours (healthy)         0.0.0.0:16379->6379/tcp                                      smart-search-redis-alt

## Port Usage:
COMMAND   PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
com.docke 787 bilgrami  213u  IPv6 0xd6a5294ef0778aa8      0t0  TCP *:13002 (LISTEN)
com.docke 787 bilgrami  232u  IPv6 0x71d2c747182113c6      0t0  TCP *:talarian-tcp (LISTEN)
com.docke 787 bilgrami  246u  IPv6 0x3810ddfde13a8227      0t0  TCP *:oms-nonsecure (LISTEN)
com.docke 787 bilgrami  352u  IPv6 0xb18712ba5c397c34      0t0  TCP *:socalia (LISTEN)
com.docke 787 bilgrami  365u  IPv6 0xe8b07d184bc505cd      0t0  TCP *:15432 (LISTEN)
com.docke 787 bilgrami  366u  IPv6 0xd43601bd8f143ab3      0t0  TCP *:16379 (LISTEN)
