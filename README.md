## tafu.casa

Homepage for tafu.casa, nothing more.

### Data

All persistent data (sites, project writeups, metrics, uploaded media) lives in
one directory. Locally this is `./data`. In Docker it's `/data`, so mount a
volume there or everything is lost when the container goes away:

```
docker run -v tafu-data:/data -p 3000:3000 tafu-casa
```

Set `ADMIN_PASSWORD` to enable the admin panel in production.

