# Cambios en Backend - Sistema de Asignación de Tickets

## 1. Cambios en el Modelo de Ticket (MongoDB)

Agregar los siguientes campos al schema del modelo `Ticket`:

```javascript
{
  asignadoA: String,
  fechaAsignacion: Date,
}
```

## 2. Nuevo Endpoint - Asignar Ticket

```javascript
app.patch("/api/ticketvvp/:ticketId/asignar", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { asignadoA } = req.body;

    // Validar que el ticket existe
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket no encontrado"
      });
    }

    // Actualizar asignación
    const update = {
      asignadoA: asignadoA || null,
      fechaAsignacion: asignadoA ? new Date() : null,
      updatedAt: new Date()
    };

    await Ticket.updateOne({ ticketId }, { $set: update });

    res.json({
      ok: true,
      data: { ...ticket.toObject(), ...update }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
```
