export type OpenApiSpec = Record<string, unknown>

export function buildOpenApiSpec(baseUrl = ''): OpenApiSpec {
  return {
    openapi: '3.0.3',
    info: {
      title: 'OslerNotes API',
      version: '1.0.0',
    },
    servers: [{ url: baseUrl || '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        PatientSexo: {
          type: 'string',
          enum: ['Masculino', 'Feminino'],
        },
        PatientRemedio: {
          type: 'object',
          required: ['nome', 'dosagem', 'frequencia'],
          properties: {
            nome: { type: 'string' },
            dosagem: { type: 'string' },
            frequencia: { type: 'string' },
          },
        },
        CreatePatientRequest: {
          type: 'object',
          required: ['nome_completo', 'idade', 'sexo', 'historico_breve_doencas', 'queixa_principal'],
          properties: {
            nome_completo: { type: 'string', maxLength: 150 },
            idade: { type: 'integer', minimum: 0, maximum: 115 },
            sexo: { $ref: '#/components/schemas/PatientSexo' },
            sexualidade: { type: 'string', nullable: true },
            historico_breve_doencas: { type: 'string', minLength: 10 },
            queixa_principal: { type: 'string' },
            doencas: { type: 'array', items: { type: 'string' } },
            remedios: { type: 'array', items: { $ref: '#/components/schemas/PatientRemedio' } },
            futuras_anotacoes: { type: 'string', nullable: true },
            cpf: { type: 'string', nullable: true },
            telefone: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            endereco: { type: 'object', additionalProperties: true },
            convenio: { type: 'string', nullable: true },
            numero_carteirinha: { type: 'string', nullable: true },
            nome_mae: { type: 'string', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/patients': {
        get: {
          summary: 'Listar pacientes (por clínica)',
          parameters: [
            { name: 'query', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50 } },
          ],
          responses: {
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Criar paciente',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePatientRequest' },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
            '400': { description: 'Validation error' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/patients/{patientId}': {
        get: {
          summary: 'Detalhar paciente',
          parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '404': { description: 'Not found' },
          },
        },
        patch: {
          summary: 'Atualizar paciente',
          parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true },
              },
            },
          },
          responses: {
            '200': { description: 'OK' },
            '400': { description: 'Bad request' },
          },
        },
        delete: {
          summary: 'Deletar paciente',
          parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '204': { description: 'No content' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/patients/{patientId}/record': {
        get: {
          summary: 'Prontuário do paciente (visibilidade por role)',
          parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Not found' },
          },
        },
      },
      '/patients/{patientId}/photo': {
        post: {
          summary: 'Upload de foto do paciente',
          parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    photo: { type: 'string', format: 'binary' },
                  },
                  required: ['photo'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'OK' },
            '400': { description: 'Bad request' },
          },
        },
      },
      '/patients/{patientId}/audit': {
        get: {
          summary: 'Listar auditoria do paciente (admin/médico)',
          parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/queue': {
        get: {
          summary: 'Listar fila/atendimentos por status',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['aguardando', 'em_atendimento', 'finalizado'] } },
            { name: 'mine', in: 'query', schema: { type: 'integer', enum: [0, 1] } },
          ],
          responses: {
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Adicionar paciente na fila (atendente/admin)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['paciente_id'],
                  properties: {
                    paciente_id: { type: 'string' },
                    prioridade: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/queue/{atendimentoId}/accept': {
        post: {
          summary: 'Médico aceita atendimento da fila',
          parameters: [{ name: 'atendimentoId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '409': { description: 'Conflict' },
          },
        },
      },
      '/queue/{atendimentoId}/call': {
        post: {
          summary: 'Médico chama paciente (inicia atendimento)',
          parameters: [{ name: 'atendimentoId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/queue/{atendimentoId}/finish': {
        post: {
          summary: 'Médico finaliza atendimento',
          parameters: [{ name: 'atendimentoId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  }
}
