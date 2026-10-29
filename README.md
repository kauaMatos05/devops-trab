# DevOps Avançado — Trabalho 1: Changelog e Release com GitHub Actions

## Integrantes

| Nome completo | R.A. |
|---|---|
| Kauã Aparecido de Matos | 250310 |
| Bruno Peclat Barbosa | 250291 |

## Sobre o projeto

Este repositório contém uma pequena página web estática (pasta [`app/`](app/)) que serve de projeto de exemplo para demonstrar duas automações independentes feitas com **GitHub Actions**:

1. **Changelog automático:** registra neste README as alterações feitas no repositório, com base nas mensagens dos commits.
2. **Release automatizada:** publica uma nova versão na seção **Releases** do GitHub, com um pacote `.zip` do projeto.

```
.
├── app/                         # projeto de exemplo (página web)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .github/workflows/
│   ├── changelog.yml            # Action de changelog
│   └── release.yml              # Action de release
└── README.md
```

## Action de changelog — `changelog.yml`

**Quando roda:** a cada `push` na branch `main` (também pode ser disparada manualmente pela aba *Actions*).

**Como funciona:**

1. Faz o checkout do repositório com o histórico completo (`fetch-depth: 0`).
2. Usa `git log` para listar os 20 commits mais recentes, com data, mensagem, hash curto e autor. Os commits feitos pelo próprio bot (marcados com `[skip ci]`) e os merges ficam de fora.
3. Substitui o conteúdo entre os marcadores `<!-- CHANGELOG:START -->` e `<!-- CHANGELOG:END -->` deste README pela lista gerada. O resto do arquivo não é alterado.
4. Se houver mudança, o bot `github-actions[bot]` faz um commit `docs: atualiza changelog no README [skip ci]` e envia para a `main`. O `[skip ci]` evita que esse commit dispare os workflows de novo e entre em loop.

A permissão `contents: write` dá ao `GITHUB_TOKEN` o direito de fazer esse commit.

## Action de release — `release.yml`

**Quando roda:** manualmente, pela aba **Actions → Release Package → Run workflow** (`workflow_dispatch`).

**Como funciona e como a versão é publicada:**

1. Faz o checkout com todas as tags.
2. **Calcula a próxima versão** no padrão *semver* (`vMAIOR.MENOR.PATCH`). Ele procura a última tag `v*`: se não existir nenhuma, a versão é `v1.0.0`; se existir, incrementa o *patch* (ex.: `v1.0.0` → `v1.0.1`).
3. **Gera o pacote** `devops-trab-vX.Y.Z.zip` com `git archive`, que contém todos os arquivos versionados no commit atual.
4. **Monta as notas da versão** com os commits feitos desde a release anterior.
5. **Publica a release** com o GitHub CLI (`gh release create`). Esse comando cria a tag, a release com título `Versão vX.Y.Z`, as notas e o `.zip` anexado para download.

As versões publicadas ficam em **[Releases](https://github.com/kauaMatos05/devops-trab/releases)**, e o histórico de execuções das duas Actions fica em **[Actions](https://github.com/kauaMatos05/devops-trab/actions)**.

## Changelog

<!-- CHANGELOG:START -->
- **2026-10-28** – docs: restaura descrição completa das Actions no README (`c56feef`) por kauaMatos05
- **2026-10-28** – fix: changelog substitui apenas a seção marcada no fim do README (`d384d5c`) por kauaMatos05
- **2026-10-28** – chore: remove CHANGELOG.md (changelog agora fica no README) (`11061e3`) por kauaMatos05
- **2026-10-28** – feat: changelog passa a ser registrado no README.md (`6137c0b`) por kauaMatos05
- **2026-10-28** – feat: notas da release geradas a partir dos commits (`9785762`) por kauaMatos05
- **2026-10-28** – feat: adiciona aplicação de lista de tarefas (`54431ad`) por kauaMatos05
- **2026-10-15** – Update release.yml (`fe61665`) por kauaMatos05
- **2026-10-15** – Add steps to zip repository contents in release workflow (`1bc58bd`) por kauaMatos05
- **2026-10-15** – Modify release.yml to calculate next version (`89c19e3`) por kauaMatos05
- **2026-10-15** – Add release workflow for manual package release (`a5cfd82`) por kauaMatos05
- **2026-10-15** – Add GitHub Actions workflow for changelog generation (`02992f2`) por kauaMatos05
- **2026-10-15** – Delete .github/workflows/teste.yml (`8d9da01`) por kauaMatos05
- **2026-10-15** – Add GitHub Actions workflow for Hello World (`85c5ac8`) por kauaMatos05
- **2026-10-15** – Create CI workflow for GitHub Actions (`d06fd21`) por kauaMatos05
<!-- CHANGELOG:END -->
