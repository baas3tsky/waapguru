/**
 * Generate ticket number in format: RHD-YYYYMMDD-0001
 * @param existingTickets - Array of existing ticket numbers to check for uniqueness
 * @returns Unique ticket number
 */
export const generateTicketNumber = (existingTickets: string[] = []): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const datePrefix = `RHD-${year}${month}${day}`;
  
  // Find existing tickets with the same date prefix
  const todaysTickets = existingTickets.filter(ticket => 
    ticket.startsWith(datePrefix)
  );
  
  // Extract sequence numbers and find the highest one
  let highestSequence = 0;
  todaysTickets.forEach(ticket => {
    const parts = ticket.split('-');
    if (parts.length === 3) {
      const sequence = parseInt(parts[2], 10);
      if (!isNaN(sequence) && sequence > highestSequence) {
        highestSequence = sequence;
      }
    }
  });
  
  // Generate next sequence number
  const nextSequence = highestSequence + 1;
  const sequenceStr = String(nextSequence).padStart(4, '0');
  
  return `${datePrefix}-${sequenceStr}`;
};

/**
 * Parse ticket number to extract date and sequence
 * @param ticketNumber - Ticket number in format RHD-YYYYMMDD-0001
 * @returns Object with date and sequence information
 */
export const parseTicketNumber = (ticketNumber: string) => {
  const parts = ticketNumber.split('-');
  if (parts.length !== 3 || parts[0] !== 'RHD') {
    return null;
  }
  
  const dateStr = parts[1];
  const sequence = parts[2];
  
  if (dateStr.length !== 8 || sequence.length !== 4) {
    return null;
  }
  
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);
  const sequenceNum = parseInt(sequence, 10);
  
  return {
    date: new Date(year, month - 1, day),
    sequence: sequenceNum,
    dateString: dateStr,
    sequenceString: sequence
  };
};

/**
 * Validate ticket number format
 * @param ticketNumber - Ticket number to validate
 * @returns True if valid format
 */
export const isValidTicketNumber = (ticketNumber: string): boolean => {
  return parseTicketNumber(ticketNumber) !== null;
};
