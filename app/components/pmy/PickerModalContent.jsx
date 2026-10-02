import { useState } from "react";
import { Icon } from "./PmyUI";

export default function PickerModalContent({ allImages, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = allImages.filter(img =>
    !search || (img.label || img.filename || "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      {/* Header */}
      <div className="pmy-ds-migrated-k855nz">
        Busque e clique em uma imagem para selecioná-la.
      </div>

      {/* Campo de busca */}
      <div className="pmy-ds-migrated-5ojkha">
        <span className="pmy-ds-migrated-w4fura"><Icon name="search" size={15} /></span>
        <input
          type="text"
          placeholder="Buscar por nome da imagem..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className="pmy-ds-migrated-bitygt"
          onFocus={e => e.target.style.borderColor = '#006600'}
          onBlur={e  => e.target.style.borderColor = '#ddd'}
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="pmy-ds-migrated-142l1o3">×</button>
        )}
      </div>

      {/* Contador */}
      <div className="pmy-ds-migrated-16q5nnv">
        {filtered.length} de {allImages.length} imagens
        {search && <span> para "<strong>{search}</strong>"</span>}
      </div>

      {/* Grid */}
      <div className="pmy-ds-migrated-1j056d9">
        {filtered.map(img => (
          <button
            key={img.id || img.url}
            type="button"
            onClick={() => onSelect(img)}
            className="pmy-ds-migrated-1vqm17k pmy-media-picker-item"
            aria-label={`Selecionar ${img.label || img.filename || "imagem"}`}
          >
            <img
              src={img.url}
              alt=""
              className="pmy-ds-migrated-1595bs8"
              onError={e => { e.target.style.display='none'; }}
            />
            <span className="pmy-ds-migrated-1b43wd">
              {img.label || img.filename || "Sem nome"}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="pmy-ds-migrated-1otk903">
            {search ? `Nenhuma imagem encontrada para "${search}"` : "Nenhuma imagem disponível. Clique em Abrir Biblioteca acima."}
          </div>
        )}
      </div>
    </div>
  );
}
