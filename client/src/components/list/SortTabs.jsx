export default function SortTabs({options,selected,onChange}){
    return(
        <div className="Sort-tabs">
            {options.map((option)=>(
                <button key={option.value}
                className={selected===option.value? "Sort-tab active":"Sort-tab"}
                onClick={()=>onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}