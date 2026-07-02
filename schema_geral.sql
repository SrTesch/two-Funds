CREATE DATABASE IF NOT EXISTS two_funds;
USE two_funds;

CREATE TABLE IF NOT EXISTS contas_conjuntas (
    codigo VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    login VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    codigo_cc VARCHAR(100),
    avatar VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS solicitacoes_cc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    codigo_cc VARCHAR(100) NOT NULL,
    status ENUM('PENDENTE', 'APROVADO', 'REJEITADO') DEFAULT 'PENDENTE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    codigo_cc VARCHAR(100),
    valor DECIMAL(10, 2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    is_personal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    codigo_cc VARCHAR(100),
    valor DECIMAL(10, 2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    is_personal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE CASCADE
);

-- Inserindo um usuário admin padrão. A senha está criptografada com bcrypt para a senha 'admin' (round 10)
INSERT INTO usuarios (nome, login, senha, is_admin, is_approved)
VALUES ('Admin', 'admin', '$2b$10$1lbJBBxbNvK9olCs/sT47.iwhlyM.lZALbCY5C6md1XOk6SCM/Tw.', TRUE, TRUE)
ON DUPLICATE KEY UPDATE id=id;
