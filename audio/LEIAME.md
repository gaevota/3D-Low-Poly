# Sons

## Passos

Coloque aqui os sons de passo (mp3) com estes nomes:

    passo-1.mp3   passo-2.mp3   passo-3.mp3   passo-4.mp3

Pode ter de 1 a 4. Cada passo do jogo sorteia um deles (sem repetir o último), muda um pouco o tom, e na corrida toca
mais alto e um pouco mais agudo. Cada arquivo deve ter **uma pisada só**, curta (cerca de 1 s ou menos).

Sem nenhum arquivo aqui, o jogo toca um passo sintetizado pelo código (`js/som.js`).

## Botões

Um som para cada tipo de botão (mp3 curto, cerca de 1 s ou menos):

| Arquivo            | Quando toca                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `roupas.mp3`       | botões do painel Roupas (roupa e manga)                                      |
| `cores.mp3`        | botões de Cor (peça a pintar e as cores da paleta)                           |
| `botoes.mp3`       | todos os outros botões                                                       |
| `iniciar-jogo.mp3` | Jogar e a escolha do ambiente                                                |
| `interruptor.mp3`  | Colocar/Tirar franja e o interruptor de parede da sala, no jogo              |

Arquivo que não existir é ignorado: o botão correspondente fica sem som. O volume dos botões fica em `UI_VOL`, em `js/som.js`.
