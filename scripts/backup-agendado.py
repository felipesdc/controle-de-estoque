#!/usr/bin/env python3
"""Backup local verificado e cópia externa, sem expurgo automático."""
import argparse
import fcntl
import hashlib
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / '.backup-config.json'
STATE = ROOT / '.local' / 'backup'


def validate_config(config):
    destination = Path(config['destino'])
    docker = Path(config['docker'])
    if not destination.is_absolute() or not docker.is_absolute():
        raise ValueError('Destino e executável Docker devem usar caminhos absolutos.')
    destination = destination.resolve()
    if destination == ROOT or ROOT in destination.parents:
        raise ValueError('A cópia externa precisa ficar fora do repositório.')
    if not docker.is_file() or not os.access(docker, os.X_OK):
        raise ValueError('Executável Docker não encontrado.')
    return destination, docker


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def copy_verified(source, destination, verify):
    # Never create a missing external root: an unplugged drive must fail visibly.
    if not destination.is_dir():
        raise RuntimeError('Destino externo indisponível. A cópia local foi preservada.')
    final = destination / source.name
    if final.exists():
        raise RuntimeError('Já existe uma cópia com esse nome; nenhum arquivo foi sobrescrito.')
    temporary = Path(tempfile.mkdtemp(prefix='.incompleto-estoque-', dir=destination))
    try:
        for name in ['estoque.sqlite', 'manifesto.json']:
            original = source / name
            if not original.is_file() or original.is_symlink():
                raise RuntimeError('Arquivo de backup ausente ou inválido.')
            target = temporary / name
            with original.open('rb') as src, target.open('xb') as dst:
                os.chmod(target, 0o600)
                shutil.copyfileobj(src, dst)
                dst.flush()
                os.fsync(dst.fileno())
            if sha256(original) != sha256(target):
                raise RuntimeError('A cópia externa não corresponde ao arquivo local.')
        verify(temporary)
        # Recheck after verification; publication only happens after all checks pass.
        if final.exists():
            raise RuntimeError('Destino criado por outra operação; cópia não publicada.')
        temporary.rename(final)
        return final
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)


def execute(config, logger):
    destination, docker = validate_config(config)
    env = dict(os.environ, PATH=str(docker.parent) + os.pathsep + os.environ.get('PATH', ''), BACKUP_DIR=str(ROOT / 'backups'))
    def command(args):
        result = subprocess.run(args, cwd=ROOT, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if result.returncode:
            # Operational output contains paths/check summaries, not database contents.
            logger.error('Comando falhou (%s): %s', result.returncode, result.stdout[-12000:])
            raise RuntimeError('Falha no backup ou na verificação; consulte o log.')
        return result.stdout
    # backup.sh sends diagnostics to stderr; capture its final stdout path separately.
    result = subprocess.run(['bash', str(ROOT / 'scripts/backup.sh')], cwd=ROOT, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        logger.error('Backup local falhou: %s', result.stderr[-12000:])
        raise RuntimeError('Backup local não concluído. Confirme Docker e API em execução.')
    source = Path(result.stdout.strip()).resolve()
    if source.parent != (ROOT / 'backups').resolve() or not source.name.startswith('estoque-') or not source.is_dir():
        raise RuntimeError('O backup não retornou um diretório local válido.')
    logger.info('Backup local verificado: %s', source)
    final = copy_verified(source, destination, lambda p: command(['bash', str(ROOT / 'scripts/verificar-backup.sh'), str(p)]))
    logger.info('Cópia externa verificada: %s', final)
    return source, final


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=CONFIG)
    args = parser.parse_args()
    os.umask(0o077)
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    logger = logging.getLogger('estoque-backup')
    logger.setLevel(logging.INFO)
    handler = RotatingFileHandler(STATE / 'rotina.log', maxBytes=1024 * 1024, backupCount=3, encoding='utf-8')
    handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
    logger.addHandler(handler)
    with (STATE / 'execucao.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            logger.warning('Outra execução está em andamento; nova execução ignorada.')
            return 0
        try:
            config = json.loads(args.config.read_text())
            logger.info('Iniciando rotina de backup.')
            source, final = execute(config, logger)
            print(f'Backup local: {source}\nCópia externa: {final}')
            return 0
        except Exception as error:
            logger.error('%s', error)
            print(f'Backup não concluído: {error}\nLog: {STATE / "rotina.log"}', file=__import__('sys').stderr)
            return 1


if __name__ == '__main__':
    raise SystemExit(main())
