#!/usr/bin/env bash
# Fluxo ponta a ponta contra o dev server: conta, papéis e CRUD do admin.
set -u
B=${BASE_URL:-http://localhost:5173}
PASS=0; FAIL=0
U=$(mktemp)
A=$(mktemp)
rm -f "$U" "$A"

check() { # nome, esperado, obtido
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf '  ok   %s\n' "$1"
  else FAIL=$((FAIL+1)); printf '  FAIL %s -> esperado %s, obteve %s\n' "$1" "$2" "$3"; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

EMAIL="cliente-$$@teste.com"

echo "conta de cliente"
check "registra novo cliente" 201 \
  "$(code -X POST "$B/api/auth/register" -H 'Content-Type: application/json' \
     -c "$U" -d "{\"name\":\"Cliente Teste\",\"email\":\"$EMAIL\",\"password\":\"senha-forte-123\"}")"
check "rejeita e-mail duplicado" 409 \
  "$(code -X POST "$B/api/auth/register" -H 'Content-Type: application/json' \
     -d "{\"name\":\"Outro\",\"email\":\"$EMAIL\",\"password\":\"senha-forte-123\"}")"
check "rejeita senha curta" 400 \
  "$(code -X POST "$B/api/auth/register" -H 'Content-Type: application/json' \
     -d '{"name":"X","email":"curto@teste.com","password":"123"}')"
check "sessão do cliente responde 200" 200 "$(code -b "$U" "$B/api/auth/session")"
ROLE=$(curl -s -b "$U" "$B/api/auth/session" | grep -o '"role":"[a-z]*"')
check "papel do novo cliente é user" '"role":"user"' "$ROLE"

echo
echo "login"
check "senha errada é 401" 401 \
  "$(code -X POST "$B/api/auth/login" -H 'Content-Type: application/json' \
     -d "{\"email\":\"$EMAIL\",\"password\":\"senha-errada\"}")"
check "e-mail inexistente é 401" 401 \
  "$(code -X POST "$B/api/auth/login" -H 'Content-Type: application/json' \
     -d '{"email":"ninguem@teste.com","password":"seja-la-o-que-for"}')"
check "admin entra" 200 \
  "$(code -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -c "$A" \
     -d '{"email":"admin@soccerpika.com","password":"trocar-esta-senha"}')"
AROLE=$(curl -s -b "$A" "$B/api/auth/session" | grep -o '"role":"[a-z]*"')
check "papel do admin é admin" '"role":"admin"' "$AROLE"

echo
echo "permissões do catálogo"
NOVO='{"name":"Camisa de Teste E2E","price":123.45,"stockQty":2,"category":"Brasileiros","era":"90s","sizes":["M","G"],"images":[]}'
check "anônimo não cria produto" 401 \
  "$(code -X POST "$B/api/products" -H 'Content-Type: application/json' -d "$NOVO")"
check "cliente comum não cria produto" 403 \
  "$(code -X POST "$B/api/products" -H 'Content-Type: application/json' -b "$U" -d "$NOVO")"
check "admin cria produto" 201 \
  "$(code -X POST "$B/api/products" -H 'Content-Type: application/json' -b "$A" -d "$NOVO")"

PID=$(curl -s "$B/api/products" | grep -o '"id":"[^"]*","slug":"camisa-de-teste-e2e"' | grep -o '[0-9a-f-]\{36\}')
check "produto novo aparece no catálogo" 36 "${#PID}"

check "admin edita produto" 200 \
  "$(code -X PUT "$B/api/products/$PID" -H 'Content-Type: application/json' -b "$A" \
     -d '{"name":"Camisa de Teste E2E","price":99.9,"stockQty":1,"category":"Brasileiros","era":"90s"}')"
NEWPRICE=$(curl -s "$B/api/products" | grep -o '"slug":"camisa-de-teste-e2e"[^}]*"price":[0-9.]*' | grep -o '"price":[0-9.]*')
check "preço foi atualizado" '"price":99.9' "$NEWPRICE"

check "cliente comum não apaga" 403 "$(code -X DELETE "$B/api/products/$PID" -b "$U")"
check "validação rejeita preço negativo" 400 \
  "$(code -X POST "$B/api/products" -H 'Content-Type: application/json' -b "$A" \
     -d '{"name":"Ruim","price":-5}')"
check "validação rejeita imagem de domínio estranho" 400 \
  "$(code -X POST "$B/api/products" -H 'Content-Type: application/json' -b "$A" \
     -d '{"name":"Ruim2","price":10,"images":["https://evil.example.com/x.png"]}')"

echo
echo "conta do cliente"
check "pedidos exigem login" 401 "$(code "$B/api/account/orders")"
check "cliente vê pedidos (vazio)" 200 "$(code -b "$U" "$B/api/account/orders")"
check "favorita uma peça" 201 \
  "$(code -X POST "$B/api/account/wishlist" -H 'Content-Type: application/json' -b "$U" \
     -d "{\"productId\":\"$PID\"}")"
WL=$(curl -s -b "$U" "$B/api/account/wishlist" | grep -c "$PID")
check "peça aparece na lista de desejos" 1 "$WL"
check "desfavorita" 204 "$(code -X DELETE "$B/api/account/wishlist?id=$PID" -b "$U")"
check "perfil salva dados de checkout" 200 \
  "$(code -X PUT "$B/api/account/profile" -H 'Content-Type: application/json' -b "$U" \
     -d '{"name":"Cliente Teste","cpf":"529.982.247-25","address":{"zipCode":"90000-000","street":"Rua X","number":"1","neighborhood":"Centro","city":"Porto Alegre","state":"RS"}}')"
check "perfil rejeita CPF inválido" 400 \
  "$(code -X PUT "$B/api/account/profile" -H 'Content-Type: application/json' -b "$U" \
     -d '{"name":"Cliente Teste","cpf":"111.111.111-11"}')"

echo
echo "limpeza"
check "admin apaga o produto de teste" 204 "$(code -X DELETE "$B/api/products/$PID" -b "$A")"
check "logout" 200 "$(code -X DELETE "$B/api/auth/session" -b "$U")"

echo
echo "$PASS passaram, $FAIL falharam"
[ "$FAIL" -eq 0 ]
