
CREATE TABLE public.shared_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared config"
  ON public.shared_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can upsert shared config"
  ON public.shared_config FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update shared config"
  ON public.shared_config FOR UPDATE
  TO anon, authenticated
  USING (true);

INSERT INTO public.shared_config (id, config) VALUES ('default', '{}');
