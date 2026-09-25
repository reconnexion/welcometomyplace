import Markdown from 'markdown-to-jsx';

type Props = {
  children?: string;
};

/** Renders Markdown source (as authored by `MarkdownEditor`) with the app's typography. */
const MarkdownContent = ({ children }: Props) => {
  if (!children) return null;
  return (
    <div className="ap-markdown">
      <Markdown>{children}</Markdown>
    </div>
  );
};

export default MarkdownContent;
