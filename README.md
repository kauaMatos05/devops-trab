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

Registra automaticamente, na seção **Changelog** no fim deste README, a lista das últimas alterações do repositório, montada a partir das mensagens dos commits.

### Etapa 1: baixar o repositório com o histórico completo

```yaml
- name: Baixar repositório com histórico completo
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

- `actions/checkout` é uma Action pronta do GitHub que faz o equivalente a um `git clone` do repositório na máquina temporária.
- `fetch-depth: 0` baixa **todo o histórico** de commits. Por padrão, o checkout baixa só o último commit, e o `git log` da próxima etapa não teria o que listar.

### Etapa 2: gerar a lista de alterações a partir dos commits

```yaml
- name: Gerar lista de alterações a partir dos commits
  run: |
    git log -n 20 --no-merges --invert-grep --grep="\[skip ci\]" --date=short \
      --pretty=format:"- **%ad** – %s (\`%h\`) por %an" > changelog.tmp
    echo "" >> changelog.tmp
    cat changelog.tmp
```

O `git log` lista os commits do repositório. Cada opção filtra ou formata essa lista:

| Opção | O que faz |
|---|---|
| `-n 20` | Pega só os 20 commits mais recentes |
| `--no-merges` | Ignora commits de *merge*, que não descrevem uma alteração de verdade |
| `--invert-grep --grep="\[skip ci\]"` | Ignora os commits cuja mensagem contém `[skip ci]`, ou seja, os commits que o próprio bot faz ao atualizar o changelog |
| `--date=short` | Mostra a data no formato `2026-10-28` |
| `--pretty=format:"..."` | Define o formato de cada linha: `%ad` é a data, `%s` a mensagem do commit, `%h` o hash curto e `%an` o autor |

Cada commit vira uma linha como esta:

```
- **2026-10-28** – feat: adiciona aplicação de lista de tarefas (`54431ad`) por kauaMatos05
```

- `> changelog.tmp`: salva a lista num arquivo temporário.
- `echo "" >> changelog.tmp`: acrescenta uma quebra de linha no final do arquivo.
- `cat changelog.tmp`: mostra a lista no log da execução, para conferência.

### Etapa 3: atualizar a seção de changelog no README.md

```yaml
- name: Atualizar seção de changelog no README.md
  run: |
    awk -v arquivo=changelog.tmp '
      /^<!-- CHANGELOG:START -->/ {
        print
        while ((getline linha < arquivo) > 0) print linha
        pular = 1
        next
      }
      /^<!-- CHANGELOG:END -->/ { pular = 0 }
      !pular
    ' README.md > README.novo
    mv README.novo README.md
    rm changelog.tmp
```

A seção de changelog do README fica entre dois marcadores, que são comentários HTML e não aparecem na página do GitHub:

```
    <!-- CHANGELOG:START -->
    (lista de commits)
    <!-- CHANGELOG:END -->
```

O `awk` lê o README linha por linha e monta uma cópia nova:

- Ao encontrar a linha que **começa** com o marcador `CHANGELOG:START` (o `^` na expressão significa "começo da linha"), imprime o marcador, depois imprime todas as linhas do `changelog.tmp` (o `getline` lê esse arquivo) e liga a variável `pular`.
- Enquanto `pular` estiver ligada, as linhas da lista antiga **não são copiadas**. O `!pular` no final significa "imprima a linha só se não estiver pulando".
- Ao chegar no marcador `CHANGELOG:END`, desliga o `pular` e volta a copiar normalmente, a partir do próprio marcador.

Assim, só o trecho entre os marcadores é trocado, e o resto do README continua igual. A cópia é gravada em `README.novo`, o `mv` coloca ela no lugar do `README.md` original e o `rm` apaga o arquivo temporário.

> O `^` é importante: como o marcador precisa estar no começo da linha, as menções a ele no meio do texto deste README (como no exemplo acima, que tem espaços na frente) não são confundidas com o marcador de verdade.

### Etapa 4: mostrar o resultado no resumo da execução

```yaml
- name: Mostrar no resumo da execução
  run: sed -n '/^<!-- CHANGELOG:START -->/,/^<!-- CHANGELOG:END -->/p' README.md >> $GITHUB_STEP_SUMMARY
```

- `sed -n '/INÍCIO/,/FIM/p'` imprime só as linhas entre os dois marcadores, ou seja, o changelog novo.
- `>> $GITHUB_STEP_SUMMARY` envia esse texto para o **resumo da execução**, que aparece na página da execução, na aba *Actions*.

### Etapa 5: salvar o README.md no repositório

```yaml
- name: Salvar README.md no repositório
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add README.md
    git diff --cached --quiet || git commit -m "docs: atualiza changelog no README [skip ci]"
    git push
```

- `git config user.name` e `user.email`: definem quem aparece como autor do commit, o bot `github-actions[bot]`.
- `git add README.md`: prepara o README alterado para o commit.
- `git diff --cached --quiet || git commit ...`: o `git diff --cached --quiet` verifica se o README realmente mudou, e o `||` significa "se não". Ou seja, **só faz o commit se houver mudança**. Se o changelog ficou igual, não cria um commit vazio.
- `[skip ci]` na mensagem: faz o GitHub **não disparar** os workflows para esse commit. Sem isso, o commit do bot dispararia a Action de changelog de novo, que faria outro commit, e assim por diante, num loop infinito.
- `git push`: envia o commit para a `main`, e o README atualizado aparece no repositório.

## Action de release — `release.yml`

Publica uma nova versão do projeto na seção **[Releases](https://github.com/kauaMatos05/devops-trab/releases)** do GitHub, com um pacote `.zip` do projeto para download.

### Quando e onde roda

```yaml
on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
```

- `workflow_dispatch`: a release **só roda manualmente**, pela aba **Actions → Release Package → Run workflow**. Assim, a dupla decide quando publicar uma versão, em vez de criar uma release a cada commit.
- `permissions: contents: write`: permite que a Action crie tags e releases no repositório.
- `runs-on: ubuntu-latest`: roda numa máquina Linux temporária do GitHub.

### Etapa 1: baixar o repositório com as tags

```yaml
- name: Baixar repositório com as tags
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

- Baixa o repositório com o histórico completo (`fetch-depth: 0`). Isso traz também as **tags** (`v1.0.0`, `v1.0.1`...), que a próxima etapa usa para saber qual foi a última versão publicada.

### Etapa 2: calcular a próxima versão

```yaml
- name: Calcular próxima versão
  run: |
    ULTIMA=$(git tag --list 'v*' --sort=-v:refname | head -n 1)
    if [ -z "$ULTIMA" ]; then
      VERSAO="v1.0.0"
    else
      NUM=${ULTIMA#v}
      MAIOR=$(echo $NUM | cut -d. -f1)
      MENOR=$(echo $NUM | cut -d. -f2)
      PATCH=$(echo $NUM | cut -d. -f3)
      VERSAO="v$MAIOR.$MENOR.$((PATCH + 1))"
    fi
    echo "Última versão: ${ULTIMA:-nenhuma} | Nova versão: $VERSAO"
    echo "VERSAO=$VERSAO" >> $GITHUB_ENV
```

As versões seguem o padrão *semver*: `vMAIOR.MENOR.PATCH`.

- `git tag --list 'v*'`: lista as tags que começam com `v`.
- `--sort=-v:refname`: ordena como **número de versão**, da maior para a menor (o `-` inverte a ordem). Assim `v1.0.10` fica acima de `v1.0.9`, o que não aconteceria em ordem alfabética.
- `head -n 1`: pega a primeira da lista, ou seja, a **última versão publicada**, e guarda na variável `ULTIMA`.
- `if [ -z "$ULTIMA" ]`: o `-z` testa se a variável está vazia. Se não existe nenhuma tag, é a primeira release, e a versão é `v1.0.0`.
- Se já existe uma versão (por exemplo, `v1.0.1`):
  - `${ULTIMA#v}` remove o `v` do começo: `1.0.1`.
  - `cut -d. -f1`, `-f2` e `-f3` separam o texto pelos pontos e pegam a 1ª, a 2ª e a 3ª parte: `MAIOR=1`, `MENOR=0`, `PATCH=1`.
  - `$((PATCH + 1))` soma 1 ao patch, e a nova versão fica `v1.0.2`.
- `echo "VERSAO=$VERSAO" >> $GITHUB_ENV`: guarda a versão numa **variável de ambiente do job**. Cada etapa roda num terminal separado, e é pelo `$GITHUB_ENV` que as etapas seguintes conseguem usar o `$VERSAO`.

### Etapa 3: zipar o conteúdo do repositório

```yaml
- name: Zipar conteúdo do repositório
  run: |
    NOME="${{ github.event.repository.name }}-$VERSAO"
    git archive --format=zip --prefix="$NOME/" -o "$NOME.zip" HEAD
    echo "ARQUIVO=$NOME.zip" >> $GITHUB_ENV
```

- `${{ github.event.repository.name }}`: o GitHub preenche com o nome do repositório, `devops-trab`. O nome do pacote fica, por exemplo, `devops-trab-v1.0.2`.
- `git archive`: cria um pacote com **os arquivos versionados** no commit atual (`HEAD`). Diferente de zipar a pasta inteira, ele não inclui a pasta `.git` nem arquivos temporários.
  - `--format=zip`: gera um `.zip`.
  - `--prefix="$NOME/"`: coloca tudo dentro de uma pasta com o nome da versão, então ao extrair aparece `devops-trab-v1.0.2/`.
  - `-o "$NOME.zip"`: nome do arquivo gerado.
- `echo "ARQUIVO=..." >> $GITHUB_ENV`: guarda o nome do zip para a etapa final.

### Etapa 4: montar as notas da versão

```yaml
- name: Montar notas da versão
  run: |
    ULTIMA=$(git tag --list 'v*' --sort=-v:refname | head -n 1)
    INTERVALO=${ULTIMA:+$ULTIMA..HEAD}
    {
      echo "## Alterações nesta versão"
      echo ""
      git log $INTERVALO --no-merges --invert-grep --grep="\[skip ci\]" \
        --pretty=format:"- %s (\`%h\`) por %an"
      echo ""
    } > NOTAS.md
    cat NOTAS.md
```

As notas são o texto que aparece na página da release, explicando o que mudou.

- `ULTIMA`: busca de novo a última tag, como na etapa 2.
- `${ULTIMA:+$ULTIMA..HEAD}`: se existe uma última tag, vira `v1.0.1..HEAD`, que no `git log` significa "os commits feitos **depois** da `v1.0.1` até agora". Se não existe nenhuma tag, fica vazio, e o `git log` lista todos os commits.
- O `git log` usa os mesmos filtros do changelog: sem merges e sem os commits `[skip ci]` do bot.
- `{ ... } > NOTAS.md`: junta o título e a lista num arquivo `NOTAS.md`.
- `cat NOTAS.md`: mostra as notas no log da execução.

### Etapa 5: criar a release com o zip para download

```yaml
- name: Criar release com o zip para download
  env:
    GH_TOKEN: ${{ github.token }}
  run: |
    gh release create "$VERSAO" "$ARQUIVO" \
      --title "Versão $VERSAO" \
      --notes-file NOTAS.md \
      --target "${{ github.sha }}"
```

- `gh` é o **GitHub CLI**, a ferramenta de linha de comando do GitHub, que já vem instalada nas máquinas do GitHub Actions.
- `GH_TOKEN: ${{ github.token }}`: passa ao `gh` o token automático da execução, com a permissão `contents: write` definida no topo.
- `gh release create "$VERSAO" "$ARQUIVO"`: cria a release com o nome da tag (por exemplo, `v1.0.2`) e **anexa o `.zip`** como arquivo para download.
- `--title "Versão $VERSAO"`: título que aparece na página de Releases.
- `--notes-file NOTAS.md`: usa as notas montadas na etapa 4 como descrição da release.
- `--target "${{ github.sha }}"`: cria a tag no commit exato em que a Action rodou.

### Como uma versão é publicada

1. Abrir a aba **[Actions](https://github.com/kauaMatos05/devops-trab/actions)** → workflow **Release Package** → **Run workflow** → **Run workflow**.
2. Esperar a execução ficar verde (✅). O log de cada etapa mostra a versão calculada e as notas.
3. A nova versão aparece em **[Releases](https://github.com/kauaMatos05/devops-trab/releases)**, com o título `Versão vX.Y.Z`, as notas e o arquivo `devops-trab-vX.Y.Z.zip` para download.

## Changelog

<!-- CHANGELOG:START -->
- **2026-10-29** – docs: explica cada etapa das Actions de changelog e release no README (`89533a5`) por kauaMatos05
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
