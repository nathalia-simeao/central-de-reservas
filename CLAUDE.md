# Central de Reservas PMY — regras do projeto

## Interface (regra da Nathalia, 09/11/2026)
- **Nunca usar `<select>`, `<input type="date">` ou `<input type="time">` nativos na Central.**
  Use os componentes padrão de `app/components/pmy/PmyUI.jsx`:
  - `DropdownSelect` para listas suspensas (busca automática com mais de 7 opções; `searchText` para buscar por outro texto);
  - `PhoneCodeSelect` para DDI (bandeira + nome do país, busca por "Brasil" ou "55");
  - `DatePicker` para datas; `TimeSelect` para horários.
- Toda lista longa precisa ter busca.
- Exceção: o portal do guia (`app/routes/guia.*`) é página leve de celular e usa os controles nativos do telefone.
