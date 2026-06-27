-- Abdillamit Life — reading list / books

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  status TEXT DEFAULT 'want_to_read' CHECK (status IN ('want_to_read', 'reading', 'read')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  cover_url TEXT,
  started_at DATE,
  finished_at DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_user_status ON public.books(user_id, status);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own books" ON public.books;
CREATE POLICY "Users can CRUD own books" ON public.books FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_books_updated_at ON public.books;
CREATE TRIGGER set_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
