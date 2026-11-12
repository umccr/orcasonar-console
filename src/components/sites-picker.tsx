import { useState, type FormEvent } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useKnownSites } from '@/lib/known-sites';

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** The docs sites to limit a question or search to; none means every site. */
export function SitesPicker({
  value,
  onChange,
}: {
  value: readonly string[];
  onChange: (sites: string[]) => void;
}) {
  const known = useKnownSites();
  const [draft, setDraft] = useState('');
  const options = [...new Set([...known, ...value])].sort();
  const label =
    value.length === 0 ? 'all' : value.length === 1 ? (value[0] ?? '') : `${value.length} sites`;

  const toggle = (site: string, on: boolean) =>
    onChange(on ? [...value, site] : value.filter((chosen) => chosen !== site));

  const add = (event: FormEvent) => {
    event.preventDefault();
    const slug = draft.trim().toLowerCase();
    if (SLUG.test(slug) && !value.includes(slug)) {
      onChange([...value, slug]);
    }
    setDraft('');
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant='outline' size='sm' className='h-7 gap-1 rounded-full px-2.5 text-xs' />
        }
      >
        <Globe />
        Sites: {label}
        <ChevronDown className='opacity-60' />
      </PopoverTrigger>
      <PopoverContent align='start' className='w-72'>
        <PopoverHeader>
          <PopoverTitle>Limit to docs sites</PopoverTitle>
          <PopoverDescription>With none chosen, every site is searched.</PopoverDescription>
        </PopoverHeader>
        {options.length > 0 ? (
          <div className='grid gap-2'>
            {options.map((site) => (
              <Label key={site} className='flex items-center gap-2 font-normal'>
                <Checkbox
                  checked={value.includes(site)}
                  onCheckedChange={(checked) => toggle(site, checked)}
                />
                {site}
              </Label>
            ))}
          </div>
        ) : (
          <p className='text-xs text-muted-foreground'>
            Sites seen in answers and searches show here. Add one by its slug.
          </p>
        )}
        <form onSubmit={add} className='flex gap-2'>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder='A site slug, as platform'
            className='h-8'
            aria-label='Add a site by its slug'
          />
          <Button type='submit' variant='outline' size='sm' className='h-8'>
            Add
          </Button>
        </form>
        {value.length > 0 && (
          <Button variant='ghost' size='sm' onClick={() => onChange([])}>
            Use every site
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
