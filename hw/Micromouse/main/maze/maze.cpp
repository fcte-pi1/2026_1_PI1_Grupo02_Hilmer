#include "maze/maze.hpp"

Labirinto::Labirinto()
    : tamanho_(static_cast<uint8_t>(Tamanho::k16x16)),
      chegada_{0, 0},
      chegada_definida_(false) {
    resetar();
}

void Labirinto::configurar(Tamanho tamanho) {
    tamanho_ = static_cast<uint8_t>(tamanho);
    resetar();
}

uint8_t Labirinto::tamanho() const {
    return tamanho_;
}

bool Labirinto::dentroDosLimites(uint8_t x, uint8_t y) const {
    return x < tamanho_ && y < tamanho_;
}

const Labirinto::Celula &Labirinto::celula(uint8_t x, uint8_t y) const {
    return grade_[y][x];
}

Labirinto::Celula &Labirinto::celula(uint8_t x, uint8_t y) {
    return grade_[y][x];
}

void Labirinto::resetar() {
    for (uint8_t y = 0; y < kMaxSize; ++y) {
        for (uint8_t x = 0; x < kMaxSize; ++x) {
            grade_[y][x].walls = 0;
            grade_[y][x].status = StatusCelula::Desconhecida;
            grade_[y][x].distancia = kDistanciaInfinita;
        }
    }
    chegada_definida_ = false;
    chegada_ = {0, 0};
}

void Labirinto::definirParede(uint8_t x, uint8_t y, Parede parede) {
    if (!dentroDosLimites(x, y)) return;
    grade_[y][x].walls |= static_cast<uint8_t>(parede);
}

bool Labirinto::temParede(uint8_t x, uint8_t y, Parede parede) const {
    if (!dentroDosLimites(x, y)) return true;
    return (grade_[y][x].walls & static_cast<uint8_t>(parede)) != 0;
}

void Labirinto::atualizarCelula(uint8_t x, uint8_t y, uint8_t paredes) {
    if (!dentroDosLimites(x, y)) return;

    Celula &atual = grade_[y][x];
    atual.walls = paredes;
    atual.status = StatusCelula::Visitada;

    // Norte
    if (paredes & ParedeNorte) {
        definirParede(x, y + 1, ParedeSul);
    } else if (dentroDosLimites(x, y + 1) && grade_[y + 1][x].status == StatusCelula::Desconhecida) {
        grade_[y + 1][x].status = StatusCelula::Livre;
    }

    // Sul
    if (paredes & ParedeSul) {
        if (y > 0) definirParede(x, y - 1, ParedeNorte);
    } else if (y > 0 && grade_[y - 1][x].status == StatusCelula::Desconhecida) {
        grade_[y - 1][x].status = StatusCelula::Livre;
    }

    // Leste
    if (paredes & ParedeLeste) {
        definirParede(x + 1, y, ParedeOeste);
    } else if (dentroDosLimites(x + 1, y) && grade_[y][x + 1].status == StatusCelula::Desconhecida) {
        grade_[y][x + 1].status = StatusCelula::Livre;
    }

    // Oeste
    if (paredes & ParedeOeste) {
        if (x > 0) definirParede(x - 1, y, ParedeLeste);
    } else if (x > 0 && grade_[y][x - 1].status == StatusCelula::Desconhecida) {
        grade_[y][x - 1].status = StatusCelula::Livre;
    }
}

bool Labirinto::encontrarProximaFronteira(Coordenada *saida) const {
    if (!saida) return false;

    for (uint8_t y = 0; y < tamanho_; ++y) {
        for (uint8_t x = 0; x < tamanho_; ++x) {
            const Celula &c = grade_[y][x];
            if (c.status == StatusCelula::Desconhecida) continue;

            const bool norte_desconhecido = dentroDosLimites(x, y + 1) &&
                !temParede(x, y, ParedeNorte) &&
                grade_[y + 1][x].status == StatusCelula::Desconhecida;
            const bool sul_desconhecido = (y > 0) &&
                !temParede(x, y, ParedeSul) &&
                grade_[y - 1][x].status == StatusCelula::Desconhecida;
            const bool leste_desconhecido = dentroDosLimites(x + 1, y) &&
                !temParede(x, y, ParedeLeste) &&
                grade_[y][x + 1].status == StatusCelula::Desconhecida;
            const bool oeste_desconhecido = (x > 0) &&
                !temParede(x, y, ParedeOeste) &&
                grade_[y][x - 1].status == StatusCelula::Desconhecida;

            if (norte_desconhecido || sul_desconhecido || leste_desconhecido || oeste_desconhecido) {
                saida->x = x;
                saida->y = y;
                return true;
            }
        }
    }

    return false;
}

bool Labirinto::definirChegada(uint8_t x, uint8_t y) {
    // Meta 2x2 não pode encostar nos limites do labirinto.
    if (x < 1 || y < 1) return false;
    if (x + kTamanhoMeta > tamanho_ - 1) return false;
    if (y + kTamanhoMeta > tamanho_ - 1) return false;

    chegada_ = {x, y};
    chegada_definida_ = true;
    return true;
}

bool Labirinto::chegadaDefinida() const {
    return chegada_definida_;
}

Labirinto::Coordenada Labirinto::posicaoChegada() const {
    return chegada_;
}

bool Labirinto::estaNaChegada(uint8_t x, uint8_t y) const {
    if (!chegada_definida_) return false;
    return x >= chegada_.x && x < chegada_.x + kTamanhoMeta &&
           y >= chegada_.y && y < chegada_.y + kTamanhoMeta;
}

void Labirinto::executarFloodFill() {
    for (uint8_t y = 0; y < tamanho_; ++y) {
        for (uint8_t x = 0; x < tamanho_; ++x) {
            grade_[y][x].distancia = kDistanciaInfinita;
        }
    }

    if (!chegada_definida_) return;

    Coordenada fila[kMaxCaminho];
    uint16_t head = 0;
    uint16_t tail = 0;

    for (uint8_t dy = 0; dy < kTamanhoMeta; ++dy) {
        for (uint8_t dx = 0; dx < kTamanhoMeta; ++dx) {
            const uint8_t mx = chegada_.x + dx;
            const uint8_t my = chegada_.y + dy;
            if (!dentroDosLimites(mx, my)) continue;
            grade_[my][mx].distancia = 0;
            fila[tail++] = {mx, my};
        }
    }

    while (head < tail) {
        const Coordenada atual = fila[head++];
        const uint16_t prox_d = grade_[atual.y][atual.x].distancia + 1;

        if (!temParede(atual.x, atual.y, ParedeNorte) &&
            dentroDosLimites(atual.x, atual.y + 1) &&
            grade_[atual.y + 1][atual.x].distancia > prox_d) {
            grade_[atual.y + 1][atual.x].distancia = prox_d;
            fila[tail++] = {atual.x, static_cast<uint8_t>(atual.y + 1)};
        }
        if (!temParede(atual.x, atual.y, ParedeSul) && atual.y > 0 &&
            grade_[atual.y - 1][atual.x].distancia > prox_d) {
            grade_[atual.y - 1][atual.x].distancia = prox_d;
            fila[tail++] = {atual.x, static_cast<uint8_t>(atual.y - 1)};
        }
        if (!temParede(atual.x, atual.y, ParedeLeste) &&
            dentroDosLimites(atual.x + 1, atual.y) &&
            grade_[atual.y][atual.x + 1].distancia > prox_d) {
            grade_[atual.y][atual.x + 1].distancia = prox_d;
            fila[tail++] = {static_cast<uint8_t>(atual.x + 1), atual.y};
        }
        if (!temParede(atual.x, atual.y, ParedeOeste) && atual.x > 0 &&
            grade_[atual.y][atual.x - 1].distancia > prox_d) {
            grade_[atual.y][atual.x - 1].distancia = prox_d;
            fila[tail++] = {static_cast<uint8_t>(atual.x - 1), atual.y};
        }
    }
}

bool Labirinto::melhorCaminho(Coordenada inicio,
                              Coordenada *buffer,
                              uint16_t capacidade,
                              uint16_t *tamanho) const {
    if (!buffer || !tamanho || capacidade == 0) return false;
    *tamanho = 0;

    if (!chegada_definida_) return false;
    if (!dentroDosLimites(inicio.x, inicio.y)) return false;
    if (grade_[inicio.y][inicio.x].distancia == kDistanciaInfinita) return false;

    Coordenada atual = inicio;
    while (true) {
        if (*tamanho >= capacidade) return false;
        buffer[(*tamanho)++] = atual;

        if (grade_[atual.y][atual.x].distancia == 0) return true;

        uint16_t melhor_d = grade_[atual.y][atual.x].distancia;
        Coordenada melhor = atual;
        bool achou = false;

        if (!temParede(atual.x, atual.y, ParedeNorte) &&
            dentroDosLimites(atual.x, atual.y + 1)) {
            const uint16_t d = grade_[atual.y + 1][atual.x].distancia;
            if (d < melhor_d) {
                melhor_d = d;
                melhor = {atual.x, static_cast<uint8_t>(atual.y + 1)};
                achou = true;
            }
        }
        if (!temParede(atual.x, atual.y, ParedeSul) && atual.y > 0) {
            const uint16_t d = grade_[atual.y - 1][atual.x].distancia;
            if (d < melhor_d) {
                melhor_d = d;
                melhor = {atual.x, static_cast<uint8_t>(atual.y - 1)};
                achou = true;
            }
        }
        if (!temParede(atual.x, atual.y, ParedeLeste) &&
            dentroDosLimites(atual.x + 1, atual.y)) {
            const uint16_t d = grade_[atual.y][atual.x + 1].distancia;
            if (d < melhor_d) {
                melhor_d = d;
                melhor = {static_cast<uint8_t>(atual.x + 1), atual.y};
                achou = true;
            }
        }
        if (!temParede(atual.x, atual.y, ParedeOeste) && atual.x > 0) {
            const uint16_t d = grade_[atual.y][atual.x - 1].distancia;
            if (d < melhor_d) {
                melhor_d = d;
                melhor = {static_cast<uint8_t>(atual.x - 1), atual.y};
                achou = true;
            }
        }

        if (!achou) return false;
        atual = melhor;
    }
}
