#!/usr/bin/env python3
"""Configura backup diário no launchd do usuário (macOS)."""
import argparse
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
LABEL = 'br.local.controle-de-estoque.backup'
STATE = ROOT / '.local' / 'backup'
CONFIG = ROOT / '.backup-config.json'


def write_private(path, data):
    fd, name = tempfile.mkstemp(prefix='.config-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destino', type=Path, help='Pasta externa existente e dedicada às cópias')
    parser.add_argument('--hora', default='20:00', help='Horário local HH:MM (padrão: 20:00)')
    parser.add_argument('--instalar', action='store_true', help='Instalar e ativar no launchd do usuário')
    parser.add_argument('--remover', action='store_true', help='Remover somente o agendamento; preserva backups e configuração')
    args = parser.parse_args()
    os.umask(0o077)
    if sys.platform != 'darwin':
        parser.error('Este instalador usa launchd e requer macOS. A rotina pode ser chamada por cron no Linux.')
    target = Path.home() / 'Library/LaunchAgents' / (LABEL + '.plist')
    domain = f'gui/{os.getuid()}'
    if args.remover:
        subprocess.run(['launchctl', 'bootout', domain + '/' + LABEL], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        target.unlink(missing_ok=True)
        print('Agendamento removido. Backups, configuração e logs preservados.')
        return
    if not args.destino or not args.destino.is_absolute() or not args.destino.is_dir():
        parser.error('Informe --destino com uma pasta absoluta existente no local externo.')
    destination = args.destino.resolve()
    if destination == ROOT or ROOT in destination.parents:
        parser.error('O destino deve ficar fora do repositório.')
    try:
        hour, minute = map(int, args.hora.split(':'))
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError()
    except ValueError:
        parser.error('Horário inválido. Use HH:MM.')
    docker = shutil.which('docker')
    if not docker:
        parser.error('Docker não encontrado no PATH.')
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    config = {'destino': str(destination), 'docker': docker, 'horario_local': f'{hour:02}:{minute:02}'}
    write_private(CONFIG, (json.dumps(config, ensure_ascii=False, indent=2) + '\n').encode())
    job = {'Label': LABEL, 'ProgramArguments': [sys.executable, str(ROOT / 'scripts/backup-agendado.py'), '--config', str(CONFIG)], 'WorkingDirectory': str(ROOT), 'StartCalendarInterval': {'Hour': hour, 'Minute': minute}, 'EnvironmentVariables': {'PATH': str(Path(docker).parent) + ':/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'}, 'ProcessType': 'Background', 'RunAtLoad': False}
    generated = STATE / 'agendamento.plist'
    write_private(generated, plistlib.dumps(job))
    subprocess.run(['plutil', '-lint', str(generated)], check=True)
    print(f'Configuração: {CONFIG}\nAgendamento preparado: {generated}')
    if args.instalar:
        target.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['launchctl', 'bootout', domain + '/' + LABEL], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        write_private(target, generated.read_bytes())
        subprocess.run(['launchctl', 'bootstrap', domain, str(target)], check=True)
        subprocess.run(['launchctl', 'print', domain + '/' + LABEL], check=True, stdout=subprocess.DEVNULL)
        print(f'Ativo diariamente às {hour:02}:{minute:02}, no horário local, durante a sessão do usuário.')
    else:
        print('Preparado, ainda não instalado. Execute novamente com --instalar para ativar.')


if __name__ == '__main__':
    main()
