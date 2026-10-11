export enum AdminControl {
  PIECE_SETS_EDIT_OPEN = 'piece-sets-edit-open',
  PIECE_SETS_DUPLICATE_OPEN = 'piece-sets-duplicate-open',
  PIECE_SETS_DELETE_OPEN = 'piece-sets-delete-open',
  PIECE_SETS_DELETE_CONFIRM = 'piece-sets-delete-confirm',
  PIECE_SETS_PROJECTS_SUBMIT = 'piece-sets-projects-submit',
  PIECE_SETS_PROJECTS_OPEN = 'piece-sets-projects-open',
  PIECE_SETS_PIECE_TOGGLE = 'piece-sets-piece-toggle',
  PIECE_SETS_NEW_PIECES_TOGGLE = 'piece-sets-new-pieces-toggle',
  PIECE_SETS_INCLUDE_RUN = 'piece-sets-include-run',
  PIECE_SETS_EXCLUDE_RUN = 'piece-sets-exclude-run',
  PIECE_SETS_COMPONENTS_SUBMIT = 'piece-sets-components-submit',
  PIECE_SETS_SAVE_SUBMIT = 'piece-sets-save-submit',
  PIECE_SETS_DUPLICATE_SUBMIT = 'piece-sets-duplicate-submit',
  PIECE_SETS_CREATE_SUBMIT = 'piece-sets-create-submit',
  PIECE_SETS_CREATE_OPEN = 'piece-sets-create-open',
}

export function adminControl(id?: string | AdminControl) {
  if (!id) return {};
  return {
    'data-admin-control': id,
  };
}
