type Props = {
  name: string;
  image: string;
  backgroundPosition?: string;
};

/** A static illustration of an event format on the home page (real `Format` records get their
 *  own `FormatCard`, see `components/format/FormatCard.tsx`). */
const FormatExample = ({ name, image, backgroundPosition }: Props) => (
  <div
    style={{
      position: 'relative',
      height: 280,
      backgroundImage: `url("${image}")`,
      backgroundSize: 'cover',
      backgroundPosition: backgroundPosition || 'center'
    }}
  >
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        margin: 0,
        padding: 12,
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: 'rgba(255, 195, 0, 0.7)'
      }}
    >
      {name}
    </div>
  </div>
);

export default FormatExample;
