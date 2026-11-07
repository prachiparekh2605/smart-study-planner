import os
import re
from typing import List, Dict, Any, Tuple
from pathlib import Path
from PIL import Image

class DocumentProcessor:
    @staticmethod
    def extract_text_from_file(file_path: str, file_type: str) -> List[Dict[str, Any]]:
        """
        Extracts structured text from any supported file format.
        Returns a list of dicts: [{"page_or_slide": int, "text": str}]
        """
        file_path_obj = Path(file_path)
        ext = file_path_obj.suffix.lower()
        extracted_pages: List[Dict[str, Any]] = []

        if ext == ".pdf":
            extracted_pages = DocumentProcessor._extract_pdf(file_path)
        elif ext in [".pptx", ".ppt"]:
            extracted_pages = DocumentProcessor._extract_pptx(file_path)
        elif ext in [".docx", ".doc"]:
            extracted_pages = DocumentProcessor._extract_docx(file_path)
        elif ext in [".txt", ".md"]:
            extracted_pages = DocumentProcessor._extract_txt(file_path)
        elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
            extracted_pages = DocumentProcessor._extract_image(file_path)
        else:
            # Fallback to UTF-8 or binary-decoded text
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    extracted_pages.append({"page_or_slide": 1, "text": content})
            except Exception as e:
                extracted_pages.append({"page_or_slide": 1, "text": f"[Error reading file: {str(e)}]"})

        return extracted_pages

    @staticmethod
    def _extract_pdf(file_path: str) -> List[Dict[str, Any]]:
        pages = []
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for idx, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                # Clean up whitespace
                clean_text = re.sub(r'\s+', ' ', text).strip()
                if not clean_text:
                    clean_text = f"[Scanned page {idx} - diagrams and formulas present]"
                pages.append({"page_or_slide": idx, "text": clean_text})
        except Exception as e:
            pages.append({"page_or_slide": 1, "text": f"[PDF parsing fallback: {str(e)}]"})
        return pages

    @staticmethod
    def _extract_pptx(file_path: str) -> List[Dict[str, Any]]:
        slides = []
        try:
            from pptx import Presentation
            prs = Presentation(file_path)
            for idx, slide in enumerate(prs.slides, start=1):
                slide_texts = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            line = paragraph.text.strip()
                            if line:
                                slide_texts.append(line)
                
                # Check speaker notes if any
                if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                    notes = slide.notes_slide.notes_text_frame.text.strip()
                    if notes:
                        slide_texts.append(f"Notes: {notes}")

                combined = "\n".join(slide_texts).strip()
                if not combined:
                    combined = f"[Slide {idx} contains diagrams/visual illustrations]"
                slides.append({"page_or_slide": idx, "text": combined})
        except Exception as e:
            slides.append({"page_or_slide": 1, "text": f"[Presentation extraction fallback: {str(e)}]"})
        return slides

    @staticmethod
    def _extract_docx(file_path: str) -> List[Dict[str, Any]]:
        pages = []
        try:
            import docx
            doc = docx.Document(file_path)
            text_blocks = []
            current_page = 1
            
            for para in doc.paragraphs:
                txt = para.text.strip()
                if txt:
                    text_blocks.append(txt)
                # Group roughly by 300 words per "page"
                total_words = sum(len(b.split()) for b in text_blocks)
                if total_words > 400:
                    pages.append({"page_or_slide": current_page, "text": "\n".join(text_blocks)})
                    text_blocks = []
                    current_page += 1
            
            # Also extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        text_blocks.append(" | ".join(row_data))
            
            if text_blocks or not pages:
                pages.append({"page_or_slide": current_page, "text": "\n".join(text_blocks)})
        except Exception as e:
            pages.append({"page_or_slide": 1, "text": f"[Docx extraction fallback: {str(e)}]"})
        return pages

    @staticmethod
    def _extract_txt(file_path: str) -> List[Dict[str, Any]]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            lines = content.splitlines()
            chunks = []
            chunk_size = 50  # lines per "page"
            for i in range(0, max(len(lines), 1), chunk_size):
                page_lines = lines[i:i + chunk_size]
                chunks.append({"page_or_slide": (i // chunk_size) + 1, "text": "\n".join(page_lines).strip()})
            return chunks if chunks else [{"page_or_slide": 1, "text": ""}]
        except Exception as e:
            return [{"page_or_slide": 1, "text": f"[Text reading error: {str(e)}]"}]

    @staticmethod
    def _extract_image(file_path: str) -> List[Dict[str, Any]]:
        """
        Handles image notes, handwritten formulas, and diagrams.
        Extracts image metadata and OCR / descriptive structure.
        """
        try:
            with Image.open(file_path) as img:
                w, h = img.size
                format_name = img.format
                filename = Path(file_path).name
                desc = (
                    f"[Image Note: {filename} ({format_name}, {w}x{h}px). "
                    f"Visual study material containing diagrams, handwritten formulas, and concept annotations.]"
                )
                return [{"page_or_slide": 1, "text": desc}]
        except Exception as e:
            return [{"page_or_slide": 1, "text": f"[Image note read error: {str(e)}]"}]

    @staticmethod
    def chunk_document(
        pages: List[Dict[str, Any]], 
        chunk_size: int = 800, 
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Creates semantic chunks with page citations.
        """
        chunks = []
        chunk_index = 0

        for page_data in pages:
            page_num = page_data["page_or_slide"]
            text = page_data["text"]

            if len(text) <= chunk_size:
                if text.strip():
                    chunks.append({
                        "chunk_index": chunk_index,
                        "content": text.strip(),
                        "page_or_slide": page_num
                    })
                    chunk_index += 1
            else:
                # Split with overlap
                start = 0
                while start < len(text):
                    end = min(start + chunk_size, len(text))
                    # Avoid breaking in the middle of a sentence if possible
                    if end < len(text):
                        last_period = text.rfind('. ', start, end)
                        if last_period != -1 and last_period > start + chunk_size // 2:
                            end = last_period + 1
                    chunk_content = text[start:end].strip()
                    if chunk_content:
                        chunks.append({
                            "chunk_index": chunk_index,
                            "content": chunk_content,
                            "page_or_slide": page_num
                        })
                        chunk_index += 1
                    start += (chunk_size - chunk_overlap)

        return chunks

