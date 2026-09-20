import { useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/skins/ui/oxide/skin.css';
import 'tinymce/skins/content/default/content.css';
import 'tinymce/skins/ui/oxide/content.css';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/code';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';
import MaterialIcon from '../components/MaterialIcon';

const RECIPES_URL = 'https://dummyjson.com/recipes?limit=0';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// This is the editable document template. Keep token names in double braces;
// selecting a recipe resolves them with API data or their safe default value.
const RECIPE_DOCUMENT_TEMPLATE = `
  <article class="recipe-document">
    <p>{{image}}</p>
    <h1>{{name}}</h1>
    <p><strong>{{cuisine}}</strong> · {{difficulty}} · ★ {{rating}} ({{reviewCount}} reviews)</p>
    <table style="width:100%;border-collapse:collapse;margin:22px 0;">
      <tbody>
        <tr><td style="padding:8px;border-bottom:1px solid #dbe2ea;"><strong>Preparation</strong></td><td style="padding:8px;border-bottom:1px solid #dbe2ea;text-align:right;">{{prepTime}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #dbe2ea;"><strong>Cooking</strong></td><td style="padding:8px;border-bottom:1px solid #dbe2ea;text-align:right;">{{cookTime}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #dbe2ea;"><strong>Serves</strong></td><td style="padding:8px;border-bottom:1px solid #dbe2ea;text-align:right;">{{servings}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #dbe2ea;"><strong>Difficulty</strong></td><td style="padding:8px;border-bottom:1px solid #dbe2ea;text-align:right;">{{difficulty}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #dbe2ea;"><strong>Cuisine</strong></td><td style="padding:8px;border-bottom:1px solid #dbe2ea;text-align:right;">{{cuisine}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #dbe2ea;"><strong>Calories</strong></td><td style="padding:8px;border-bottom:1px solid #dbe2ea;text-align:right;">{{calories}}</td></tr>
      </tbody>
    </table>
    <h2>Ingredients</h2>
    <ul>{{ingredients}}</ul>
    <h2>Instructions</h2>
    <ol>{{instructions}}</ol>
    <p><strong>Tags:</strong> {{tags}} &nbsp; <strong>Meal type:</strong> {{mealType}}</p>
  </article>`;

const valueOrDefault = (value, fallback) => (value === undefined || value === null || value === '' ? fallback : value);
const listItems = (items, fallback) => Array.isArray(items) && items.length
  ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  : `<li>${escapeHtml(fallback)}</li>`;

const fillRecipeTemplate = (recipe) => {
  if (!recipe) return RECIPE_DOCUMENT_TEMPLATE;

  const name = valueOrDefault(recipe.name, 'Untitled recipe');
  const tokens = {
    image: recipe.image
      ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(name)}" style="width:100%;max-height:290px;object-fit:cover;border-radius:12px;" />`
      : '<span style="color:#64748b;">No recipe image available</span>',
    name: escapeHtml(name),
    cuisine: escapeHtml(valueOrDefault(recipe.cuisine, 'Cuisine not specified')),
    difficulty: escapeHtml(valueOrDefault(recipe.difficulty, 'Not specified')),
    rating: escapeHtml(valueOrDefault(recipe.rating, 'Not rated')),
    reviewCount: escapeHtml(valueOrDefault(recipe.reviewCount, '0')),
    prepTime: escapeHtml(recipe.prepTimeMinutes == null ? 'Not specified' : `${recipe.prepTimeMinutes} min`),
    cookTime: escapeHtml(recipe.cookTimeMinutes == null ? 'Not specified' : `${recipe.cookTimeMinutes} min`),
    servings: escapeHtml(valueOrDefault(recipe.servings, 'Not specified')),
    calories: escapeHtml(recipe.caloriesPerServing == null ? 'Not specified' : `${recipe.caloriesPerServing} kcal`),
    ingredients: listItems(recipe.ingredients, 'No ingredients provided'),
    instructions: listItems(recipe.instructions, 'No instructions provided'),
    tags: escapeHtml(Array.isArray(recipe.tags) && recipe.tags.length ? recipe.tags.join(', ') : 'No tags'),
    mealType: escapeHtml(Array.isArray(recipe.mealType) && recipe.mealType.length ? recipe.mealType.join(', ') : 'Not specified'),
  };

  return RECIPE_DOCUMENT_TEMPLATE.replace(/{{(\w+)}}/g, (_token, key) => tokens[key] ?? `{{${key}}}`);
};

const imageToDataUrl = async (source) => {
  const response = await fetch(source, { mode: 'cors' });
  if (!response.ok) throw new Error('Recipe image could not be loaded.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function RecipeDocumentPage() {
  const editorRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [content, setContent] = useState(RECIPE_DOCUMENT_TEMPLATE);
  const [status, setStatus] = useState('loading');
  const [isExporting, setIsExporting] = useState(false);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => String(recipe.id) === selectedId),
    [recipes, selectedId],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecipes() {
      try {
        const response = await fetch(RECIPES_URL, { signal: controller.signal });
        if (!response.ok) throw new Error('Recipe service is unavailable.');
        const payload = await response.json();
        setRecipes(payload.recipes || []);
        setStatus('ready');
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('error');
      }
    }

    loadRecipes();
    return () => controller.abort();
  }, []);

  const selectRecipe = (event) => {
    const recipe = recipes.find((item) => String(item.id) === event.target.value);
    setSelectedId(event.target.value);
    setContent(fillRecipeTemplate(recipe));
  };

  const exportPdf = async () => {
    const editorContent = editorRef.current?.getContent() || content;
    if (!editorContent || isExporting) return;
    setIsExporting(true);
    let container;
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      container = document.createElement('section');
      container.innerHTML = editorContent;
      // The source must remain in the viewport: html2canvas renders an empty canvas
      // for elements positioned outside it in some browsers.
      container.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;width:794px;min-height:1123px;box-sizing:border-box;padding:42px;background:#fff;color:#172033;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;';
      const exportImages = Array.from(container.querySelectorAll('img'));
      await Promise.all(exportImages.map(async (image) => {
        try {
          image.src = await imageToDataUrl(image.src);
        } catch {
          // A remote image without CORS permission would taint the canvas and make
          // the whole export fail. The text document remains useful without it.
          image.remove();
        }
      }));
      document.body.appendChild(container);

      await Promise.all(exportImages.map((image) => new Promise((resolve) => {
        if (image.complete) resolve();
        else {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        }
      })));

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        windowWidth: 794,
      });
      const imageData = canvas.toDataURL('image/png');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const printableWidth = pageWidth - (margin * 2);
      const printableHeight = pageHeight - (margin * 2);
      const imageHeight = (canvas.height * printableWidth) / canvas.width;
      let renderedHeight = 0;

      pdf.addImage(imageData, 'PNG', margin, margin, printableWidth, imageHeight);
      renderedHeight += printableHeight;
      while (renderedHeight < imageHeight) {
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, margin - renderedHeight, printableWidth, imageHeight);
        renderedHeight += printableHeight;
      }
      pdf.save(`${(selectedRecipe?.name || 'recipe').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Recipe PDF export failed:', error);
      window.alert('The PDF could not be created. Please try again.');
    } finally {
      if (container?.parentNode) container.parentNode.removeChild(container);
      setIsExporting(false);
    }
  };

  return (
    <section>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Recipe workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Recipe document editor</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Select a recipe, tailor its document in the self-hosted editor, then export a print-ready A4 PDF.</p>
        </div>
        <button type="button" onClick={exportPdf} disabled={!selectedRecipe || isExporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
          <MaterialIcon name="picture_as_pdf" className="text-lg" /> {isExporting ? 'Creating PDF…' : 'Export A4 PDF'}
        </button>
      </div>

      <div className="soft-card mt-7 rounded-3xl p-5 sm:p-6">
        <label htmlFor="recipe-select" className="block text-sm font-bold text-slate-800">Recipe</label>
        <div className="mt-2 flex items-center gap-3">
          <select id="recipe-select" value={selectedId} onChange={selectRecipe} disabled={status !== 'ready'} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-wait">
            {status === 'loading' && <option>Loading recipes…</option>}
            {status === 'error' && <option>Could not load recipes</option>}
            {status === 'ready' && <option value="">Select a recipe to populate the template…</option>}
            {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
          </select>
          {selectedRecipe && <img src={selectedRecipe.image} alt="" className="hidden h-12 w-16 rounded-lg object-cover sm:block" />}
        </div>
        {status === 'error' && <p className="mt-3 text-sm text-rose-600">We couldn’t reach DummyJSON. Refresh the page to try again.</p>}
      </div>

      <div className="soft-card mt-5 overflow-hidden rounded-3xl p-3 sm:p-5">
        <Editor
          onInit={(_event, editor) => { editorRef.current = editor; }}
          value={content}
          onEditorChange={setContent}
          init={{
            height: 680,
            license_key: 'gpl',
            menubar: 'file edit view insert format tools table help',
            plugins: 'advlist anchor autolink code link lists table wordcount',
            toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link table | code',
            branding: false,
            promotion: false,
            content_style: 'body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #172033; padding: 18px; } h1 { color: #0f766e; font-size: 28px; } h2 { margin-top: 28px; color: #172033; font-size: 20px; } li { margin-bottom: 7px; }',
          }}
        />
      </div>
    </section>
  );
}
