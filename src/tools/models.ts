import { z } from 'zod';
import { READ_ONLY, defineTool, type ToolDefinition } from './define.js';

const modelName = z.string().describe('Exact model (note type) name, e.g. "Basic" (see model_names).');

export const modelTools: ToolDefinition[] = [
    defineTool({
        name: 'model_names',
        title: 'List note types',
        description: 'Returns the names of all models (note types), e.g. "Basic", "Basic (and reversed card)", "Cloze".',
        inputSchema: {},
        annotations: READ_ONLY,
        handler: (_args, anki) => anki.invoke('modelNames'),
    }),
    defineTool({
        name: 'model_names_and_ids',
        title: 'List note types with IDs',
        description: 'Returns an object mapping every model (note type) name to its model ID.',
        inputSchema: {},
        annotations: READ_ONLY,
        handler: (_args, anki) => anki.invoke('modelNamesAndIds'),
    }),
    defineTool({
        name: 'model_field_names',
        title: 'List fields of a note type',
        description: 'Returns the field names of the given model in order, e.g. ["Front", "Back"]. Use these exact names as keys of `fields` in add_note/add_notes; the first field must not be empty.',
        inputSchema: { modelName },
        annotations: READ_ONLY,
        handler: ({ modelName }, anki) => anki.invoke('modelFieldNames', { modelName }),
    }),
    defineTool({
        name: 'model_fields_on_templates',
        title: 'Fields used by card templates',
        description: 'Returns, for each card template of the model, which fields appear on the front and back side: {"Card 1": [["Front"], ["Back"]], ...}.',
        inputSchema: { modelName },
        annotations: READ_ONLY,
        handler: ({ modelName }, anki) => anki.invoke('modelFieldsOnTemplates', { modelName }),
    }),
];
