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

DROP TABLE IF EXISTS despesas;
DROP TABLE IF EXISTS receitas;

CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('DESPESA', 'RECEITA') NOT NULL,
    codigo_cc VARCHAR(100) NULL, -- NULL significa categoria global/padrão do sistema
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE CASCADE,
    UNIQUE KEY uq_categoria_por_conta (nome, codigo_cc, tipo) -- Evita duplicados no mesmo contexto
);

CREATE TABLE IF NOT EXISTS contas_bancarias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    codigo_cc VARCHAR(100) NULL,
    nome VARCHAR(100) NOT NULL,
    banco VARCHAR(50) DEFAULT 'OUTROS',
    saldo_atual DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cor VARCHAR(20) DEFAULT '#6366F1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lancamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_cc VARCHAR(100) NOT NULL,
    usuario_id INT NOT NULL,
    categoria_id INT NOT NULL,
    conta_id INT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    tipo ENUM('DESPESA', 'RECEITA') NOT NULL,
    is_personal BOOLEAN DEFAULT FALSE,
    metodo_pagamento ENUM('PIX', 'DEBITO', 'CREDITO') DEFAULT 'PIX',
    status ENUM('PAGO', 'PENDENTE') DEFAULT 'PAGO',
    data_lancamento DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    parcela_atual INT DEFAULT 1,
    total_parcelas INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transferencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conta_origem_id INT NOT NULL,
    conta_destino_id INT NOT NULL,
    usuario_id INT NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    descricao VARCHAR(255) NULL,
    data_transferencia DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conta_origem_id) REFERENCES contas_bancarias(id) ON DELETE CASCADE,
    FOREIGN KEY (conta_destino_id) REFERENCES contas_bancarias(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS faturas_avulsas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    codigo_cc VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NOT NULL DEFAULT 'Fatura Anterior',
    valor DECIMAL(10, 2) NOT NULL,
    mes_referencia VARCHAR(7) NOT NULL,
    data_vencimento DATE NOT NULL,
    status ENUM('PENDENTE', 'PAGO') DEFAULT 'PENDENTE',
    is_personal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (codigo_cc) REFERENCES contas_conjuntas(codigo) ON DELETE CASCADE
);

-- Inserindo um usuário admin padrão. A senha está criptografada com bcrypt para a senha 'admin' (round 10)
INSERT INTO usuarios (nome, login, senha, is_admin, is_approved)
VALUES ('Admin', 'admin', '$2b$10$1lbJBBxbNvK9olCs/sT47.iwhlyM.lZALbCY5C6md1XOk6SCM/Tw.', TRUE, TRUE)
ON DUPLICATE KEY UPDATE id=id;

-- Migração / Atualização idempotente para bancos de dados já existentes
SET @dbname = DATABASE();
SET @tablename = "lancamentos";
SET @columnname = "conta_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE lancamentos ADD COLUMN conta_id INT NULL, ADD CONSTRAINT fk_lancamentos_conta FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;


