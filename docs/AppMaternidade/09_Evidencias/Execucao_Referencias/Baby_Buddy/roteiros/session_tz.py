# Executado via: manage.py shell -c "exec(open(r'<este arquivo>', encoding='utf-8').read())"
# Compara a mesma operação da API por SESSÃO (passa pelo UserTimezoneMiddleware)
# com o que foi observado por TOKEN no log 03 (C-09). Banco: o mesmo SQLite local.
import json
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from core.models import Sleep, Child

User = get_user_model()
resp_a = User.objects.get(username="resp_a")
print("fuso do perfil de resp_a:", resp_a.settings.timezone)
print("TIME_ZONE ativo no shell:", timezone.get_current_timezone_name())

c = Client(HTTP_HOST="127.0.0.1")
c.force_login(resp_a)
child3 = Child.objects.get(slug="bebe-familia-dois")
payload = {"child": child3.id, "start": "2026-10-21T15:00:00-03:00", "end": "2026-10-21T15:40:00-03:00"}
r = c.post("/api/sleep/", data=json.dumps(payload), content_type="application/json")
body = r.json()
print("SESSAO POST /api/sleep/", payload)
print("  HTTP", r.status_code, "nap=", body.get("nap"), "start(resposta)=", body.get("start"), "duration=", body.get("duration"))

r = c.get(f"/api/sleep/?child={child3.id}&ordering=start")
rows = r.json()["results"]
print("SESSAO GET /api/sleep/?child=3 -> como os mesmos registros aparecem na sessao (fuso do usuario):")
for s in rows:
    print("  id", s["id"], "start", s["start"], "end", s["end"], "nap", s["nap"], "duration", s["duration"])

print("Banco (UTC) para os mesmos registros:")
for s in Sleep.objects.filter(child=child3).order_by("start"):
    print("  id", s.id, "start (armazenado)", s.start.isoformat(), "nap", s.nap)

# Classificação de soneca que o modelo faria em cada fuso para o registro das 16:30 -03:00
import zoneinfo
s1630 = Sleep.objects.filter(child=child3, start__hour__in=[19]).first()
if s1630:
    for tz in ("UTC", "America/Sao_Paulo"):
        with timezone.override(zoneinfo.ZoneInfo(tz)):
            local = timezone.localtime(s1630.start).time()
            nap = Sleep.settings.nap_start_min <= local <= Sleep.settings.nap_start_max
            print(f"  regra de soneca (06:00-18:00) para id {s1630.id} no fuso {tz}: hora local {local} -> nap={nap}")
