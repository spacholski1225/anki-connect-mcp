#!/usr/bin/env node

import { callAnkiConnect } from "./methods/anki.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getVersion,
  getTags,
  guiCurrentCard,
  guiStartCardTimer,
  guiShowQuestion,
  guiShowAnswer,
  guiAnswerCard,
  guiDeckOverview,
  guiDeckBrowser,
  guiDeckReview,
  guiBrowse,
  guiAddCards,
  guiExitAnki,
  multi,
  upgrade
} from "./tools/misc.js";
import {
  deckNames,
  deckNamesAndIds,
  getDecks,
  changeDeck,
  deleteDecks,
  getDeckConfig,
  saveDeckConfig,
  setDeckConfigId,
  cloneDeckConfigId,
  removeDeckConfigId
} from "./tools/decks.js";
import {
  modelNames,
  modelNamesAndIds,
  modelFieldNames,
  modelFieldsOnTemplates
} from "./tools/models.js";
import {
  addNote,
  addNotes,
  canAddNotes,
  updateNoteFields,
  addTags,
  removeTags,
  findNotes,
  notesInfo
} from "./tools/notes.js";
import {
  suspend,
  unsuspend,
  areSuspended,
  areDue,
  getIntervals,
  findCards,
  cardsToNotes,
  cardsInfo
} from "./tools/cards.js";

const server = new McpServer({
  name: 'anki-connect mcp',
  version: '0.0.1'
});

server.tool(
  'create_flashcard',
  {
    front: z.string(),
    back: z.string()
  },
  async ({ front, back }) => {
    const mcpFlashCard = {
      action: "addNote",
      version: 6,
      params: {
        note: {
          deckName: "Default",
          modelName: "Basic",
          fields: {
            Front: front,
            Back: back
          },
          tags: ["ai"],
          options: {
            allowDuplicate: false
          }
        }
      }
    } 
    const responseData = await callAnkiConnect(mcpFlashCard);
    return {content: [{type: "text", text: JSON.stringify(responseData)}]}
  }
)

// Version and basic info tools
server.tool(
  'version',
  async () => {
    const response = await getVersion();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'upgrade',
  async () => {
    const response = await upgrade();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'get_tags',
  async () => {
    const response = await getTags();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

// GUI control tools
server.tool(
  'gui_current_card',
  async () => {
    const response = await guiCurrentCard();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_start_card_timer',
  async () => {
    const response = await guiStartCardTimer();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_show_question',
  async () => {
    const response = await guiShowQuestion();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_show_answer',
  async () => {
    const response = await guiShowAnswer();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_answer_card',
  {
    ease: z.number().min(1).max(4).describe('Answer ease: 1=Again, 2=Hard, 3=Good, 4=Easy')
  },
  async ({ ease }) => {
    const response = await guiAnswerCard(ease);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_deck_overview',
  {
    name: z.string().describe('Name of the deck to open')
  },
  async ({ name }) => {
    const response = await guiDeckOverview(name);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_deck_browser',
  async () => {
    const response = await guiDeckBrowser();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_deck_review',
  {
    name: z.string().describe('Name of the deck to review')
  },
  async ({ name }) => {
    const response = await guiDeckReview(name);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_browse',
  {
    query: z.string().describe('Search query for browsing cards')
  },
  async ({ query }) => {
    const response = await guiBrowse(query);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_add_cards',
  async () => {
    const response = await guiAddCards();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'gui_exit_anki',
  async () => {
    const response = await guiExitAnki();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'multi',
  {
    actions: z.array(z.object({
      action: z.string(),
      version: z.number(),
      params: z.record(z.any()).optional()
    })).describe('Array of AnkiConnect requests to execute')
  },
  async ({ actions }) => {
    const response = await multi(actions);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

// Deck management tools
server.tool(
  'deck_names',
  async () => {
    const response = await deckNames();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'deck_names_and_ids',
  async () => {
    const response = await deckNamesAndIds();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'get_decks',
  {
    cards: z.array(z.number()).describe('Array of card IDs to get deck information for')
  },
  async ({ cards }) => {
    const response = await getDecks(cards);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'change_deck',
  {
    cards: z.array(z.number()).describe('Array of card IDs to move'),
    deck: z.string().describe('Name of the target deck')
  },
  async ({ cards, deck }) => {
    const response = await changeDeck(cards, deck);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'delete_decks',
  {
    decks: z.array(z.string()).describe('Array of deck names to delete'),
    cardsToo: z.boolean().optional().describe('If true, cards within deleted decks will also be deleted; otherwise moved to default deck')
  },
  async ({ decks, cardsToo }) => {
    const response = await deleteDecks(decks, cardsToo);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'get_deck_config',
  {
    deck: z.string().describe('Name of the deck to get configuration for')
  },
  async ({ deck }) => {
    const response = await getDeckConfig(deck);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'save_deck_config',
  {
    config: z.object({
      lapse: z.object({
        leechFails: z.number(),
        delays: z.array(z.number()),
        minInt: z.number(),
        leechAction: z.number(),
        mult: z.number()
      }),
      dyn: z.boolean(),
      autoplay: z.boolean(),
      mod: z.number(),
      id: z.number(),
      maxTaken: z.number(),
      new: z.object({
        bury: z.boolean(),
        order: z.number(),
        initialFactor: z.number(),
        perDay: z.number(),
        delays: z.array(z.number()),
        separate: z.boolean(),
        ints: z.array(z.number())
      }),
      name: z.string(),
      rev: z.object({
        bury: z.boolean(),
        ivlFct: z.number(),
        ease4: z.number(),
        maxIvl: z.number(),
        perDay: z.number(),
        minSpace: z.number(),
        fuzz: z.number()
      }),
      timer: z.number(),
      replayq: z.boolean(),
      usn: z.number()
    }).describe('Deck configuration object to save')
  },
  async ({ config }) => {
    const response = await saveDeckConfig(config);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'set_deck_config_id',
  {
    decks: z.array(z.string()).describe('Array of deck names to change configuration for'),
    configId: z.number().describe('Configuration group ID to assign')
  },
  async ({ decks, configId }) => {
    const response = await setDeckConfigId(decks, configId);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'clone_deck_config_id',
  {
    name: z.string().describe('Name for the new configuration group'),
    cloneFrom: z.number().optional().describe('ID of the configuration group to clone from (optional, defaults to default group)')
  },
  async ({ name, cloneFrom }) => {
    const response = await cloneDeckConfigId(name, cloneFrom);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'remove_deck_config_id',
  {
    configId: z.number().describe('ID of the configuration group to remove')
  },
  async ({ configId }) => {
    const response = await removeDeckConfigId(configId);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

// Model management tools
server.tool(
  'model_names',
  async () => {
    const response = await modelNames();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'model_names_and_ids',
  async () => {
    const response = await modelNamesAndIds();
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'model_field_names',
  {
    modelName: z.string().describe('Name of the model to get field names for')
  },
  async ({ modelName }) => {
    const response = await modelFieldNames(modelName);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'model_fields_on_templates',
  {
    modelName: z.string().describe('Name of the model to get template fields for')
  },
  async ({ modelName }) => {
    const response = await modelFieldsOnTemplates(modelName);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'add_note',
  {
    deckName: z.string().describe('Name of the deck to add the note to'),
    modelName: z.string().describe('Name of the note model/type'),
    fields: z.record(z.string()).describe('Object with field names as keys and field values as strings'),
    tags: z.array(z.string()).optional().describe('Array of tags to add to the note'),
    audio: z.object({
      url: z.string(),
      filename: z.string(),
      skipHash: z.string().optional(),
      fields: z.string()
    }).optional().describe('Optional audio attachment')
  },
  async ({ deckName, modelName, fields, tags, audio }) => {
    const note = { deckName, modelName, fields, tags, audio };
    const response = await addNote(note);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'add_notes',
  {
    notes: z.array(z.object({
      deckName: z.string().describe('Name of the deck to add the note to'),
      modelName: z.string().describe('Name of the note model/type'),
      fields: z.record(z.string()).describe('Object with field names as keys and field values as strings'),
      tags: z.array(z.string()).optional().describe('Array of tags to add to the note'),
      audio: z.object({
        url: z.string(),
        filename: z.string(),
        skipHash: z.string().optional(),
        fields: z.string()
      }).optional().describe('Optional audio attachment')
    })).describe('Array of note objects to create')
  },
  async ({ notes }) => {
    const response = await addNotes(notes);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'can_add_notes',
  {
    notes: z.array(z.object({
      deckName: z.string().describe('Name of the deck to add the note to'),
      modelName: z.string().describe('Name of the note model/type'),
      fields: z.record(z.string()).describe('Object with field names as keys and field values as strings'),
      tags: z.array(z.string()).optional().describe('Array of tags to add to the note')
    })).describe('Array of note objects to check')
  },
  async ({ notes }) => {
    const response = await canAddNotes(notes);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'update_note_fields',
  {
    id: z.number().describe('ID of the note to update'),
    fields: z.record(z.string()).describe('Object with field names as keys and new field values as strings')
  },
  async ({ id, fields }) => {
    const noteUpdate = { id, fields };
    const response = await updateNoteFields(noteUpdate);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'add_tags',
  {
    notes: z.array(z.number()).describe('Array of note IDs to add tags to'),
    tags: z.string().describe('Space-separated string of tags to add')
  },
  async ({ notes, tags }) => {
    const response = await addTags(notes, tags);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'remove_tags',
  {
    notes: z.array(z.number()).describe('Array of note IDs to remove tags from'),
    tags: z.string().describe('Space-separated string of tags to remove')
  },
  async ({ notes, tags }) => {
    const response = await removeTags(notes, tags);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'find_notes',
  {
    query: z.string().describe('Search query string (same syntax as Anki browser)')
  },
  async ({ query }) => {
    const response = await findNotes(query);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'notes_info',
  {
    notes: z.array(z.number()).describe('Array of note IDs to get information for')
  },
  async ({ notes }) => {
    const response = await notesInfo(notes);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

// Card management tools
server.tool(
  'suspend',
  {
    cards: z.array(z.number()).describe('Array of card IDs to suspend')
  },
  async ({ cards }) => {
    const response = await suspend(cards);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'unsuspend',
  {
    cards: z.array(z.number()).describe('Array of card IDs to unsuspend')
  },
  async ({ cards }) => {
    const response = await unsuspend(cards);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'are_suspended',
  {
    cards: z.array(z.number()).describe('Array of card IDs to check if suspended')
  },
  async ({ cards }) => {
    const response = await areSuspended(cards);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'are_due',
  {
    cards: z.array(z.number()).describe('Array of card IDs to check if due')
  },
  async ({ cards }) => {
    const response = await areDue(cards);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'get_intervals',
  {
    cards: z.array(z.number()).describe('Array of card IDs to get intervals for'),
    complete: z.boolean().optional().describe('If true, returns all intervals; if false, returns only the most recent interval')
  },
  async ({ cards, complete }) => {
    const response = await getIntervals(cards, complete);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'find_cards',
  {
    query: z.string().describe('Search query string (same syntax as Anki browser)')
  },
  async ({ query }) => {
    const response = await findCards(query);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'cards_to_notes',
  {
    cards: z.array(z.number()).describe('Array of card IDs to convert to note IDs')
  },
  async ({ cards }) => {
    const response = await cardsToNotes(cards);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

server.tool(
  'cards_info',
  {
    cards: z.array(z.number()).describe('Array of card IDs to get detailed information for')
  },
  async ({ cards }) => {
    const response = await cardsInfo(cards);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }
)

const transport = new StdioServerTransport();
await server.connect(transport);