---
Date: 2026-02-03
Title: Configuring Plex for access through Tailscale
Description: Getting Plex and Tailscale working together isn't obvious -- here are the two config changes that actually fix it.
---
If you're running a Plex media server at home and want to access it securely from anywhere without exposing it to the public internet, Tailscale is an excellent solution. Getting the two to play nicely together can be tricky though, if you don't know the specific configuration quirks.

## What is Tailscale?

Tailscale is a zero-configuration VPN built on WireGuard that creates a secure mesh network between your devices. Unlike traditional VPNs that funnel all your traffic through a central server, Tailscale creates direct, encrypted peer-to-peer connections. It's perfect for accessing home services without port forwarding or the security risk of exposing things directly to the internet.

## Why use Plex over Tailscale?

A few good reasons:

- **Security** - Your Plex server isn't exposed to the public internet, reducing your attack surface
- **No port forwarding** - No router config, no worrying about your ISP blocking ports
- **Privacy** - Your streaming traffic stays within your private Tailscale network
- **Simplicity** - Once it's set up, it just works across all your devices

## The Problem

Many people run into issues when trying to access Plex through Tailscale. The connection fails, or Plex can't find the server, even though everything looks correctly configured. It's a common problem that comes down to how Plex handles secure connections and DNS resolution.

Plex uses `plex.direct` domains to enable HTTPS connections to your server, even on private networks. To make this work, Plex generates a unique `plex.direct` subdomain that maps to your server's IP address and provides a valid SSL certificate for the connection. When you're on Tailscale's private IP range, this mechanism can break down if it isn't configured properly -- the `plex.direct` domain needs to resolve to your Tailscale IP and pass through any DNS filtering you have in place.

## The Solution

After wrestling with this myself, I found two configuration changes that make everything work.

### 1. Set the custom server access URL

In your Plex server settings, set the **Custom server access URL** to your server's Tailscale IP address. This lets Plex generate the correct `xxx.plex.direct` URL for secure connectivity.

A couple of things to get right here:

- **Use the IP address, not the Tailscale machine name.** I tried the machine name first -- it doesn't work.
- **Include the port number.** Even though 32400 is the default, leaving it out breaks things.

So if your Tailscale IP is `100.111.222.333`, set the custom URL to:

```
http://100.111.222.333:32400
```

### 2. Whitelist `*.plex.direct` in NextDNS

If you're using NextDNS (or similar DNS filtering) with DNS rebinding protection enabled, you'll need to whitelist `*.plex.direct`.

DNS rebinding protection blocks private IP addresses from being returned in public DNS responses -- normally a sensible security feature. The problem is that `xxx.plex.direct` addresses need to resolve to your Tailscale IP, which sits in a private range. Whitelisting overrides this protection for the Plex domain only, so the DNS resolution can work as intended.

Without this, any `xxx.plex.direct` address will fail to resolve, and your connection will fail.

## Wrap Up

Two changes -- custom server access URL with your Tailscale IP and port, and `*.plex.direct` whitelisted in NextDNS. Once those are in place, Plex works seamlessly over Tailscale. Remote access without any of the usual exposure.
