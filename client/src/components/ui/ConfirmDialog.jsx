import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

export function ConfirmDialog({ open, title = 'Confirm action', onClose, onConfirm, children }) { return <Modal open={open} title={title} onClose={onClose}><p>{children}</p><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={onConfirm}>Confirm</Button></div></Modal>; }
