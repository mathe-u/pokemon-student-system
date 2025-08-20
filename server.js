const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Para servir arquivos estáticos

// Caminhos dos arquivos de dados
const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const CREATED_ACTIVITIES_FILE = path.join(DATA_DIR, 'created-activities.json');

// Função para criar diretório de dados se não existir
async function ensureDataDirectory() {
    try {
        await fs.access(DATA_DIR);
    } catch (error) {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Função para ler arquivo JSON
async function readJSONFile(filePath, defaultValue = []) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Se arquivo não existe ou está corrompido, retorna valor padrão
        return defaultValue;
    }
}

// Função para escrever arquivo JSON
async function writeJSONFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware para logs
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ==================== ENDPOINTS PARA ESTUDANTES ====================

// GET /api/students - Buscar todos os estudantes
app.get('/api/students', async (req, res) => {
    try {
        const students = await readJSONFile(STUDENTS_FILE, []);
        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Erro ao buscar estudantes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/students - Criar novo estudante
app.post('/api/students', async (req, res) => {
    try {
        const { name, pokemonType } = req.body;

        // Validação dos dados
        if (!name || !pokemonType) {
            return res.status(400).json({
                success: false,
                message: 'Nome e tipo de Pokémon são obrigatórios'
            });
        }

        const students = await readJSONFile(STUDENTS_FILE, []);

        // Verificar se aluno já existe
        const existingStudent = students.find(
            student => student.name.toLowerCase() === name.toLowerCase()
        );

        if (existingStudent) {
            return res.status(409).json({
                success: false,
                message: 'Aluno já cadastrado'
            });
        }

        // Criar novo estudante
        const newStudent = {
            id: Date.now(),
            name: name.trim(),
            pokemonType,
            totalPoints: 0,
            createdAt: new Date().toISOString()
        };

        students.push(newStudent);
        await writeJSONFile(STUDENTS_FILE, students);

        res.status(201).json({
            success: true,
            message: `Aluno ${name} cadastrado com sucesso!`,
            data: newStudent
        });
    } catch (error) {
        console.error('Erro ao criar estudante:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// PUT /api/students/:id - Atualizar estudante
app.put('/api/students/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const { totalPoints } = req.body;

        if (isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do estudante inválido'
            });
        }

        const students = await readJSONFile(STUDENTS_FILE, []);
        const studentIndex = students.findIndex(s => s.id === studentId);

        if (studentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Estudante não encontrado'
            });
        }

        // Atualizar pontuação
        if (totalPoints !== undefined) {
            students[studentIndex].totalPoints = totalPoints;
            students[studentIndex].updatedAt = new Date().toISOString();
        }

        await writeJSONFile(STUDENTS_FILE, students);

        res.json({
            success: true,
            message: 'Estudante atualizado com sucesso!',
            data: students[studentIndex]
        });
    } catch (error) {
        console.error('Erro ao atualizar estudante:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// DELETE /api/students/:id - Excluir estudante
app.delete('/api/students/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);

        if (isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do estudante inválido'
            });
        }

        const students = await readJSONFile(STUDENTS_FILE, []);
        const initialLength = students.length;
        const filteredStudents = students.filter(s => s.id !== studentId);

        if (filteredStudents.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Estudante não encontrado'
            });
        }

        await writeJSONFile(STUDENTS_FILE, filteredStudents);

        res.json({
            success: true,
            message: 'Estudante excluído com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir estudante:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// ==================== ENDPOINTS PARA ATIVIDADES CRIADAS ====================

// GET /api/created-activities - Buscar todas as atividades criadas
app.get('/api/created-activities', async (req, res) => {
    try {
        const createdActivities = await readJSONFile(CREATED_ACTIVITIES_FILE, []);
        res.json({
            success: true,
            data: createdActivities
        });
    } catch (error) {
        console.error('Erro ao buscar atividades criadas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/created-activities - Criar nova atividade
app.post('/api/created-activities', async (req, res) => {
    try {
        const { name, defaultPoints, description } = req.body;

        // Validação dos dados
        if (!name || !defaultPoints) {
            return res.status(400).json({
                success: false,
                message: 'Nome e pontuação padrão são obrigatórios'
            });
        }

        if (defaultPoints < 1 || defaultPoints > 100) {
            return res.status(400).json({
                success: false,
                message: 'Pontuação deve estar entre 1 e 100'
            });
        }

        const createdActivities = await readJSONFile(CREATED_ACTIVITIES_FILE, []);

        // Verificar se atividade já existe
        const existingActivity = createdActivities.find(
            activity => activity.name.toLowerCase() === name.toLowerCase()
        );

        if (existingActivity) {
            return res.status(409).json({
                success: false,
                message: 'Atividade já existe'
            });
        }

        // Criar nova atividade
        const newActivity = {
            id: Date.now(),
            name: name.trim(),
            defaultPoints: parseInt(defaultPoints),
            description: description ? description.trim() : '',
            createdAt: new Date().toISOString()
        };

        createdActivities.push(newActivity);
        await writeJSONFile(CREATED_ACTIVITIES_FILE, createdActivities);

        res.status(201).json({
            success: true,
            message: `Atividade "${name}" criada com sucesso!`,
            data: newActivity
        });
    } catch (error) {
        console.error('Erro ao criar atividade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// DELETE /api/created-activities/:id - Excluir atividade criada
app.delete('/api/created-activities/:id', async (req, res) => {
    try {
        const activityId = parseInt(req.params.id);

        if (isNaN(activityId)) {
            return res.status(400).json({
                success: false,
                message: 'ID da atividade inválido'
            });
        }

        const createdActivities = await readJSONFile(CREATED_ACTIVITIES_FILE, []);
        const initialLength = createdActivities.length;
        const filteredActivities = createdActivities.filter(a => a.id !== activityId);

        if (filteredActivities.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Atividade não encontrada'
            });
        }

        await writeJSONFile(CREATED_ACTIVITIES_FILE, filteredActivities);

        res.json({
            success: true,
            message: 'Atividade excluída com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir atividade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// ==================== ENDPOINTS PARA ATIVIDADES ATRIBUÍDAS ====================

// GET /api/activities - Buscar todas as atividades atribuídas
app.get('/api/activities', async (req, res) => {
    try {
        const activities = await readJSONFile(ACTIVITIES_FILE, []);
        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Erro ao buscar atividades:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/activities - Atribuir pontos de atividade
app.post('/api/activities', async (req, res) => {
    try {
        const { studentId, activityId, points } = req.body;

        // Validação dos dados
        if (!studentId || !activityId || !points) {
            return res.status(400).json({
                success: false,
                message: 'ID do estudante, ID da atividade e pontos são obrigatórios'
            });
        }

        if (points < 1 || points > 100) {
            return res.status(400).json({
                success: false,
                message: 'Pontuação deve estar entre 1 e 100'
            });
        }

        // Buscar dados necessários
        const students = await readJSONFile(STUDENTS_FILE, []);
        const createdActivities = await readJSONFile(CREATED_ACTIVITIES_FILE, []);
        const activities = await readJSONFile(ACTIVITIES_FILE, []);

        // Verificar se estudante e atividade existem
        const student = students.find(s => s.id === parseInt(studentId));
        const createdActivity = createdActivities.find(a => a.id === parseInt(activityId));

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Estudante não encontrado'
            });
        }

        if (!createdActivity) {
            return res.status(404).json({
                success: false,
                message: 'Atividade não encontrada'
            });
        }

        // Atualizar pontuação do estudante
        const studentIndex = students.findIndex(s => s.id === parseInt(studentId));
        const oldPoints = students[studentIndex].totalPoints;
        students[studentIndex].totalPoints += parseInt(points);
        students[studentIndex].updatedAt = new Date().toISOString();

        // Criar registro da atividade atribuída
        const newActivityRecord = {
            id: Date.now(),
            studentId: parseInt(studentId),
            activityId: parseInt(activityId),
            name: createdActivity.name,
            points: parseInt(points),
            date: new Date().toLocaleDateString('pt-BR'),
            createdAt: new Date().toISOString()
        };

        activities.push(newActivityRecord);

        // Salvar dados atualizados
        await Promise.all([
            writeJSONFile(STUDENTS_FILE, students),
            writeJSONFile(ACTIVITIES_FILE, activities)
        ]);

        // Calcular se houve evolução
        const oldLevel = Math.min(2, Math.floor(oldPoints / 100));
        const newLevel = Math.min(2, Math.floor(students[studentIndex].totalPoints / 100));
        const evolved = newLevel > oldLevel;

        res.status(201).json({
            success: true,
            message: `Atividade "${createdActivity.name}" atribuída para ${student.name}! (+${points} pontos)`,
            data: {
                activity: newActivityRecord,
                student: students[studentIndex],
                evolved: evolved,
                newLevel: newLevel
            }
        });
    } catch (error) {
        console.error('Erro ao atribuir atividade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/activities/student/:studentId - Buscar atividades de um estudante específico
app.get('/api/activities/student/:studentId', async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);

        if (isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do estudante inválido'
            });
        }

        const activities = await readJSONFile(ACTIVITIES_FILE, []);
        const studentActivities = activities.filter(a => a.studentId === studentId);

        res.json({
            success: true,
            data: studentActivities
        });
    } catch (error) {
        console.error('Erro ao buscar atividades do estudante:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// ==================== ENDPOINTS UTILITÁRIOS ====================

// GET /api/ranking - Buscar ranking dos estudantes
app.get('/api/ranking', async (req, res) => {
    try {
        const { pokemon, limit = 5 } = req.query;
        const students = await readJSONFile(STUDENTS_FILE, []);

        let filteredStudents = students;

        // Filtrar por tipo de Pokémon se especificado
        if (pokemon && pokemon !== 'all') {
            filteredStudents = students.filter(student => student.pokemonType === pokemon);
        }

        // Ordenar por pontuação (decrescente) e limitar resultados
        const ranking = filteredStudents
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            data: ranking,
            total: filteredStudents.length
        });
    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/stats - Estatísticas gerais
app.get('/api/stats', async (req, res) => {
    try {
        const [students, activities, createdActivities] = await Promise.all([
            readJSONFile(STUDENTS_FILE, []),
            readJSONFile(ACTIVITIES_FILE, []),
            readJSONFile(CREATED_ACTIVITIES_FILE, [])
        ]);

        const totalPoints = students.reduce((sum, student) => sum + student.totalPoints, 0);
        const avgPoints = students.length > 0 ? Math.round(totalPoints / students.length) : 0;

        // Contar por tipo de Pokémon
        const pokemonCount = students.reduce((counts, student) => {
            counts[student.pokemonType] = (counts[student.pokemonType] || 0) + 1;
            return counts;
        }, {});

        // Evoluções por nível
        const evolutionLevels = students.reduce((levels, student) => {
            const level = Math.min(2, Math.floor(student.totalPoints / 100));
            levels[level] = (levels[level] || 0) + 1;
            return levels;
        }, {});

        res.json({
            success: true,
            data: {
                totalStudents: students.length,
                totalActivities: createdActivities.length,
                totalActivitiesAssigned: activities.length,
                totalPoints: totalPoints,
                averagePoints: avgPoints,
                pokemonDistribution: pokemonCount,
                evolutionDistribution: evolutionLevels
            }
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// ==================== MIDDLEWARE DE ERRO 404 ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
    });
});

// ==================== MIDDLEWARE DE ERRO GLOBAL ====================
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================
async function startServer() {
    try {
        // Criar diretório de dados
        await ensureDataDirectory();

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📡 API disponível em http://localhost:${PORT}/api`);
            console.log(`📁 Dados salvos em: ${DATA_DIR}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();