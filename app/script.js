const form = document.getElementById('form');
const entrada = document.getElementById('entrada');
const lista = document.getElementById('lista');

let tarefas = JSON.parse(localStorage.getItem('tarefas') || '[]');

function salvar() {
  localStorage.setItem('tarefas', JSON.stringify(tarefas));
}

function render() {
  lista.innerHTML = '';
  tarefas.forEach((tarefa, i) => {
    const li = document.createElement('li');
    if (tarefa.feita) li.classList.add('feita');

    const texto = document.createElement('span');
    texto.textContent = tarefa.texto;
    texto.style.cursor = 'pointer';
    texto.onclick = () => {
      tarefas[i].feita = !tarefas[i].feita;
      salvar();
      render();
    };

    const remover = document.createElement('button');
    remover.textContent = 'Remover';
    remover.onclick = () => {
      tarefas.splice(i, 1);
      salvar();
      render();
    };

    li.append(texto, remover);
    lista.appendChild(li);
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  tarefas.push({ texto: entrada.value.trim(), feita: false });
  entrada.value = '';
  salvar();
  render();
});

render();
