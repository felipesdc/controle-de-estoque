#!/usr/bin/env python3
"""Prepare a private local MFA key. Existing nonempty keys are never rotated."""
import base64, os, re
from pathlib import Path
p=Path(__file__).resolve().parent.parent/'.env'
if p.is_symlink(): raise SystemExit('Use um arquivo .env local regular.')
text=p.read_text() if p.exists() else ''
match=re.search(r'^AUTH_ENCRYPTION_KEY=(.*)$',text,re.M)
if match and match.group(1).strip():
 print('Chave de autenticação adicional existente preservada.')
else:
 line='AUTH_ENCRYPTION_KEY='+base64.b64encode(os.urandom(32)).decode()
 text=re.sub(r'^AUTH_ENCRYPTION_KEY=.*$',line,text,flags=re.M) if match else text.rstrip()+'\n'+line+'\n'
 p.write_text(text);p.chmod(0o600)
 print('Chave privada de autenticação adicional preparada no .env. Guarde uma cópia segura separada do banco.')
