#!/usr/bin/env python3
import fcntl
import importlib.util
import json
import logging
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('routine', Path(__file__).with_name('backup-agendado.py'))
routine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(routine)


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / 'local' / 'estoque-teste'
        self.source.mkdir(parents=True)
        (self.source / 'estoque.sqlite').write_bytes(b'Banco ficticio de teste')
        (self.source / 'manifesto.json').write_text('{"teste":true}')
        self.external = self.root / 'externo com espaços'
        self.external.mkdir()

    def tearDown(self):
        self.temporary.cleanup()

    def test_copy_is_verified_before_publication(self):
        def verify(stage):
            self.assertFalse((self.external / self.source.name).exists())
            self.assertEqual((stage / 'estoque.sqlite').read_bytes(), b'Banco ficticio de teste')
            self.assertEqual((stage / 'estoque.sqlite').stat().st_mode & 0o777, 0o600)
        copied = routine.copy_verified(self.source, self.external, verify)
        self.assertEqual((copied / 'manifesto.json').read_bytes(), (self.source / 'manifesto.json').read_bytes())
        self.assertEqual(copied.stat().st_mode & 0o777, 0o700)
        with self.assertRaises(RuntimeError):
            routine.copy_verified(self.source, self.external, verify)
        self.assertEqual((copied / 'estoque.sqlite').read_bytes(), b'Banco ficticio de teste')

    def test_invalid_external_copy_not_published_local_preserved(self):
        def reject(stage):
            raise RuntimeError('verificação rejeitada')
        with self.assertRaisesRegex(RuntimeError, 'rejeitada'):
            routine.copy_verified(self.source, self.external, reject)
        self.assertEqual(list(self.external.iterdir()), [])
        self.assertTrue((self.source / 'estoque.sqlite').is_file())

    def test_missing_drive_not_recreated(self):
        missing = self.root / 'disco-desconectado' / 'copias'
        with self.assertRaisesRegex(RuntimeError, 'indisponível'):
            routine.copy_verified(self.source, missing, lambda _: None)
        self.assertFalse(missing.exists())

    def test_local_success_external_failure_keeps_local(self):
        project = self.root / 'projeto'
        backup = project / 'backups' / 'estoque-teste'
        backup.parent.mkdir(parents=True)
        shutil.copytree(self.source, backup)
        config = {'destino': str(self.root / 'offline'), 'docker': '/bin/sh'}
        result = subprocess.CompletedProcess([], 0, str(backup) + '\n', '')
        with patch.object(routine, 'ROOT', project), patch.object(routine.subprocess, 'run', return_value=result):
            with self.assertRaisesRegex(RuntimeError, 'indisponível'):
                routine.execute(config, logging.getLogger('test'))
        self.assertTrue((backup / 'estoque.sqlite').is_file())

    def test_failed_backup_does_not_publish(self):
        result = subprocess.CompletedProcess([], 1, '', 'Docker indisponível')
        with patch.object(routine.subprocess, 'run', return_value=result):
            with self.assertRaisesRegex(RuntimeError, 'Backup local não concluído'):
                routine.execute({'destino': str(self.external), 'docker': '/bin/sh'}, logging.getLogger('test'))
        self.assertEqual(list(self.external.iterdir()), [])

    def test_concurrent_execution_skips_backup(self):
        state = self.root / 'state'
        state.mkdir()
        with (state / 'execucao.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with patch.object(routine, 'STATE', state), patch.object(sys, 'argv', ['backup-agendado.py']), patch.object(routine, 'execute') as execute:
                self.assertEqual(routine.main(), 0)
                execute.assert_not_called()
        logger = logging.getLogger('estoque-backup')
        for handler in list(logger.handlers):
            handler.close()
            logger.removeHandler(handler)

    @unittest.skipUnless(sys.platform == 'darwin', 'launchd requer macOS')
    def test_generate_schedule_without_installing(self):
        scripts = self.root / 'projeto' / 'scripts'
        scripts.mkdir(parents=True)
        installer = scripts / 'agendar-backup.py'
        shutil.copyfile(Path(__file__).with_name('agendar-backup.py'), installer)
        result = subprocess.run([sys.executable, str(installer), '--destino', str(self.external), '--hora', '20:15'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        state = scripts.parent / '.local/backup/agendamento.plist'
        job = plistlib.loads(state.read_bytes())
        self.assertEqual(job['StartCalendarInterval'], {'Hour':20,'Minute':15})
        self.assertFalse(job['RunAtLoad'])
        config = json.loads((scripts.parent / '.backup-config.json').read_text())
        self.assertEqual(config['destino'], str(self.external.resolve()))
        self.assertEqual((scripts.parent / '.backup-config.json').stat().st_mode & 0o777, 0o600)
        self.assertIn('ainda não instalado', result.stdout)
        invalid = subprocess.run([sys.executable, str(installer), '--destino', str(self.external), '--hora', '25:00'], capture_output=True)
        self.assertNotEqual(invalid.returncode, 0)


if __name__ == '__main__':
    unittest.main()
