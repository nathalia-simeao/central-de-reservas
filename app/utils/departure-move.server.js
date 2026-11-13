// Quadro → mover saída: o administrador arrasta o cartão para outra data.
// Move junto as reservas ativas, a escala dos guias e o registro da saída
// (etiquetas, checklists, observações, anexos). O horário é mantido, a menos
// que um novo seja escolhido.

const ACTIVE_STATUSES = ["CONFIRMED", "PENDING"];
// Reservas destes canais só mudam de data dentro da Central: a remarcação
// precisa ser feita também na plataforma de origem.
const CENTRAL_OWNED = new Set(["MANUAL", "CENTRAL", "SHOPIFY", "GUIDE"]);

export function externalChannelBookings(bookings = []) {
  return bookings.filter((b) => !CENTRAL_OWNED.has(String(b?.platform || "").toUpperCase()));
}

function uniq(list) {
  return [...new Set((list || []).map(String))];
}

function mergeNotes(a, b) {
  const notes = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
  return notes.length ? notes.sort((x, y) => String(x?.at || "").localeCompare(String(y?.at || ""))) : null;
}

function mergeChecklists(target, source) {
  if (!target) return source || null;
  if (!source) return target;
  return {
    lists: [...(target.lists || []), ...(source.lists || [])],
    auto: { ...(source.auto || {}), ...(target.auto || {}) },
    hideDone: { ...(source.hideDone || {}), ...(target.hideDone || {}) },
  };
}

/** Junta o registro da saída de origem com o da data de destino (quando já existe). */
export function mergeDepartureRecords(target, source) {
  if (!target) return null;
  return {
    tagIds: uniq([...(target.tagIds || []), ...(source?.tagIds || [])]),
    guideNotes: mergeNotes(target.guideNotes, source?.guideNotes),
    checklists: mergeChecklists(target.checklists, source?.checklists),
    checkMeetAt: target.checkMeetAt || source?.checkMeetAt || null,
    checkStartAt: target.checkStartAt || source?.checkStartAt || null,
    checkMidAt: target.checkMidAt || source?.checkMidAt || null,
    checkEndAt: target.checkEndAt || source?.checkEndAt || null,
  };
}

export function validateMove({ fromStartTime, toStartTime, now = new Date() }) {
  if (!(fromStartTime instanceof Date) || Number.isNaN(fromStartTime.getTime())) return "Saída de origem inválida.";
  if (!(toStartTime instanceof Date) || Number.isNaN(toStartTime.getTime())) return "Data de destino inválida.";
  if (fromStartTime.getTime() === toStartTime.getTime()) return "A saída já está nesta data e horário.";
  if (toStartTime.getTime() < now.getTime() - 60 * 60 * 1000) return "Não é possível mover uma saída para o passado.";
  return null;
}

/**
 * Move a saída inteira numa transação.
 * @returns {{ bookingIds: string[], assignmentIds: string[], external: object[], departure: object|null }}
 */
export async function moveDeparture(prisma, { tourId, fromStartTime, toStartTime, by = "Equipe", now = new Date() }) {
  const problem = validateMove({ fromStartTime, toStartTime, now });
  if (problem) {
    const error = new Error(problem);
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const bookings = await tx.booking.findMany({
      where: { tourId, startTime: fromStartTime, status: { in: ACTIVE_STATUSES } },
      select: { id: true, platform: true, customerName: true, movedFromStartTime: true },
    });

    for (const b of bookings) {
      await tx.booking.update({
        where: { id: b.id },
        data: {
          startTime: toStartTime,
          movedAt: now,
          movedBy: by,
          // Guarda sempre a data original da reserva, mesmo depois de vários movimentos.
          movedFromStartTime: b.movedFromStartTime || fromStartTime,
        },
      });
    }

    const assignments = await tx.guideAssignment.findMany({
      where: { tourId, startTime: fromStartTime, status: "ASSIGNED" },
      select: { id: true },
    });
    if (assignments.length) {
      await tx.guideAssignment.updateMany({
        where: { id: { in: assignments.map((a) => a.id) } },
        data: { startTime: toStartTime },
      });
    }

    // A lista de espera acompanha a saída.
    await tx.waitlistEntry.updateMany({
      where: { tourId, startTime: fromStartTime, status: { not: "REMOVED" } },
      data: { startTime: toStartTime },
    });

    const source = await tx.tourDeparture.findUnique({ where: { tourId_startTime: { tourId, startTime: fromStartTime } } });
    let departure = null;
    if (source) {
      const target = await tx.tourDeparture.findUnique({ where: { tourId_startTime: { tourId, startTime: toStartTime } } });
      if (target) {
        const merged = mergeDepartureRecords(target, source);
        await tx.departureAttachment.updateMany({ where: { departureId: source.id }, data: { departureId: target.id } });
        departure = await tx.tourDeparture.update({ where: { id: target.id }, data: merged });
        await tx.tourDeparture.delete({ where: { id: source.id } });
      } else {
        departure = await tx.tourDeparture.update({ where: { id: source.id }, data: { startTime: toStartTime } });
      }
    }

    return {
      bookingIds: bookings.map((b) => b.id),
      assignmentIds: assignments.map((a) => a.id),
      external: externalChannelBookings(bookings).map((b) => ({ id: b.id, platform: b.platform, customerName: b.customerName })),
      departure,
    };
  });
}
