#!/bin/bash
# Drop WAN access to Coolify management/realtime ports published by Docker.
# Traefik still serves public sites on :80/:443 via docker network.
set -euo pipefail

apply_v4() {
  iptables -nL DOCKER-USER >/dev/null 2>&1 || iptables -N DOCKER-USER

  # Remove prior managed rules (idempotent)
  while iptables -C DOCKER-USER -m comment --comment "ccsms-harden" -j RETURN 2>/dev/null; do
    iptables -D DOCKER-USER -m comment --comment "ccsms-harden" -j RETURN || true
  done
  for comment in ccsms-harden-http ccsms-harden-https; do
    while iptables -C DOCKER-USER -m comment --comment "$comment" -j ACCEPT 2>/dev/null; do
      iptables -D DOCKER-USER -m comment --comment "$comment" -j ACCEPT || true
    done
  done
  for port in 8000 6001 6002 8080; do
    while iptables -C DOCKER-USER -p tcp --dport "$port" -j DROP -m comment --comment "ccsms-harden" 2>/dev/null; do
      iptables -D DOCKER-USER -p tcp --dport "$port" -j DROP -m comment --comment "ccsms-harden" || true
    done
  done
  while iptables -C DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN -m comment --comment "ccsms-harden" 2>/dev/null; do
    iptables -D DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN -m comment --comment "ccsms-harden" || true
  done

  iptables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN -m comment --comment "ccsms-harden"
  iptables -I DOCKER-USER 2 -p tcp --dport 80 -j ACCEPT -m comment --comment "ccsms-harden-http"
  iptables -I DOCKER-USER 3 -p tcp --dport 443 -j ACCEPT -m comment --comment "ccsms-harden-https"
  iptables -I DOCKER-USER 4 -p tcp --dport 8000 -j DROP -m comment --comment "ccsms-harden"
  iptables -I DOCKER-USER 5 -p tcp --dport 6001 -j DROP -m comment --comment "ccsms-harden"
  iptables -I DOCKER-USER 6 -p tcp --dport 6002 -j DROP -m comment --comment "ccsms-harden"
  iptables -I DOCKER-USER 7 -p tcp --dport 8080 -j DROP -m comment --comment "ccsms-harden"
}

apply_v6() {
  if ! command -v ip6tables >/dev/null; then return 0; fi
  ip6tables -nL DOCKER-USER >/dev/null 2>&1 || ip6tables -N DOCKER-USER || return 0

  while ip6tables -C DOCKER-USER -m comment --comment "ccsms-harden" -j RETURN 2>/dev/null; do
    ip6tables -D DOCKER-USER -m comment --comment "ccsms-harden" -j RETURN || true
  done
  for comment in ccsms-harden-http ccsms-harden-https; do
    while ip6tables -C DOCKER-USER -m comment --comment "$comment" -j ACCEPT 2>/dev/null; do
      ip6tables -D DOCKER-USER -m comment --comment "$comment" -j ACCEPT || true
    done
  done
  for port in 8000 6001 6002 8080; do
    while ip6tables -C DOCKER-USER -p tcp --dport "$port" -j DROP -m comment --comment "ccsms-harden" 2>/dev/null; do
      ip6tables -D DOCKER-USER -p tcp --dport "$port" -j DROP -m comment --comment "ccsms-harden" || true
    done
  done
  while ip6tables -C DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN -m comment --comment "ccsms-harden" 2>/dev/null; do
    ip6tables -D DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN -m comment --comment "ccsms-harden" || true
  done

  ip6tables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN -m comment --comment "ccsms-harden" || true
  ip6tables -I DOCKER-USER 2 -p tcp --dport 80 -j ACCEPT -m comment --comment "ccsms-harden-http" || true
  ip6tables -I DOCKER-USER 3 -p tcp --dport 443 -j ACCEPT -m comment --comment "ccsms-harden-https" || true
  ip6tables -I DOCKER-USER 4 -p tcp --dport 8000 -j DROP -m comment --comment "ccsms-harden" || true
  ip6tables -I DOCKER-USER 5 -p tcp --dport 6001 -j DROP -m comment --comment "ccsms-harden" || true
  ip6tables -I DOCKER-USER 6 -p tcp --dport 6002 -j DROP -m comment --comment "ccsms-harden" || true
  ip6tables -I DOCKER-USER 7 -p tcp --dport 8080 -j DROP -m comment --comment "ccsms-harden" || true
}

apply_v4
apply_v6
echo "coolify-docker-harden applied $(date -Is)"
