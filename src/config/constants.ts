// CONSTANTS //
// cache messages -------------------------------------------------------------------------------+
export const BATCH_SIZE = 1000;                                                                 //
export const BATCH_EXPIRATION = 30 * 60 * 1000; // ms                                           //
export const MAX_FILE_SIZE = 3000000; // b - any file larger than this limit will be ignored    // 
export const MAX_ATTACHMENTS_SIZE = 10000000; // b - max attachments size for 1 message         //
export const DEFAULT_FILETYPE = 'text/plain; charset=utf-8';                                    //
export const DEFAULT_EXTENSION = '.txt';                                                        //
// db messages  ---------------------------------------------------------------------------------+
export const MESSAGES_EXPIRATION = 7 * 24 * 3600 * 1000; // ms                                  //
// embed limits  --------------------------------------------------------------------------------+
export const MAX_EMBED_SIZE = 6000;                                                             //
export const MAX_EMBED_AUTHOR = 256;                                                            //
export const MAX_EMBED_TITLE = 256;                                                             //
export const MAX_EMBED_DESCRIPTION = 4096;                                                      //
export const MAX_EMBED_FIELDS = 25;                                                             //
export const MAX_EMBED_FIELD_NAME = 256;                                                        //
export const MAX_EMBED_FIELD_VALUE = 1024;                                                      //
export const MAX_EMBED_FOOTER = 2048;                                                           //
// guild limits  --------------------------------------------------------------------------------+
export const LARGE_GUILD_MEMBERS = 10000;                                                       //
export const LARGE_GUILD_VOICES = 100;                                                          //
// ----------------------------------------------------------------------------------------------+