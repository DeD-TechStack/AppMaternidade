# Executado via: manage.py shell -c "exec(open(r'<este arquivo>').read())"
# Cria usuários fictícios com papéis diferentes e grava os tokens SOMENTE no scratch.
import json
import secrets
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.conf import settings as dj_settings
from core.models import Child

OUT = r"<SCRATCH>/tokens.json"
User = get_user_model()


def mk(username, role, tz=None):
    u, created = User.objects.get_or_create(username=username)
    u.set_password(secrets.token_urlsafe(24))  # senha descartável, nunca registrada
    u.is_staff = False
    u.is_superuser = role == "standard"  # mesmo efeito do createuser sem flags
    u.save()
    if role == "caregiver":
        u.groups.add(Group.objects.get(name=dj_settings.BABY_BUDDY["CAREGIVER_GROUP_NAME"]))
    if role == "read_only":
        u.groups.add(Group.objects.get(name=dj_settings.BABY_BUDDY["READ_ONLY_GROUP_NAME"]))
    if tz:
        u.settings.timezone = tz
        u.settings.save()
    return u


users = {
    "resp_a": mk("resp_a", "standard", tz="America/Sao_Paulo"),
    "cuidadora_b": mk("cuidadora_b", "caregiver"),
    "avo_c": mk("avo_c", "read_only"),
    "baba_familia2": mk("baba_familia2", "caregiver"),
}

tokens = {name: u.settings.api_key().key for name, u in users.items()}
ids = {name: u.id for name, u in users.items()}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"tokens": tokens, "ids": ids}, f)

print("usuarios:", {n: {"id": u.id, "superuser": u.is_superuser, "grupos": list(u.groups.values_list("name", flat=True)), "tz": u.settings.timezone} for n, u in users.items()})
print("criancas:", list(Child.objects.values_list("id", "slug")))
for g in Group.objects.all():
    print("grupo", g.name, sorted(g.permissions.values_list("codename", flat=True)))
